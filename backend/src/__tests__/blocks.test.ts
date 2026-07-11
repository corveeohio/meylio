import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../prisma.js';

describe('blocks and discovery exclusion', () => {
  const createdUserIds: string[] = [];

  after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  async function createCandidate() {
    const user = await prisma.user.create({ data: { email: `test-${randomUUID()}@example.com` } });
    createdUserIds.push(user.id);
    await prisma.musicProfile.create({
      data: { userId: user.id, source: 'manual', topArtists: [], topGenres: ['pop'] },
    });
    return user;
  }

  it('rejects a user blocking themselves', async () => {
    const user = await createCandidate();
    const response = await request(app)
      .post('/blocks')
      .send({ blockerId: user.id, blockedId: user.id });
    assert.equal(response.status, 400);
  });

  it('excludes a blocked user from the discovery pool for both parties', async () => {
    const me = await createCandidate();
    const other = await createCandidate();

    const poolBefore = await request(app).get(`/discovery/pool?userId=${me.id}`);
    assert.ok(
      poolBefore.body.some((candidate: { userId: string }) => candidate.userId === other.id),
      'candidate should be visible before blocking'
    );

    const blockResponse = await request(app)
      .post('/blocks')
      .send({ blockerId: me.id, blockedId: other.id });
    assert.equal(blockResponse.status, 200);

    const poolAfterForMe = await request(app).get(`/discovery/pool?userId=${me.id}`);
    assert.ok(
      !poolAfterForMe.body.some((candidate: { userId: string }) => candidate.userId === other.id),
      'blocked candidate should be excluded for the blocker'
    );

    const poolAfterForOther = await request(app).get(`/discovery/pool?userId=${other.id}`);
    assert.ok(
      !poolAfterForOther.body.some((candidate: { userId: string }) => candidate.userId === me.id),
      'blocker should also be excluded for the blocked user (mutual)'
    );
  });

  it('excludes a matched user from the discovery pool for both parties', async () => {
    const me = await createCandidate();
    const other = await createCandidate();

    await request(app).post(`/matches/like/${other.id}`).send({ userId: me.id });
    const matchResponse = await request(app).post(`/matches/like/${me.id}`).send({ userId: other.id });
    assert.equal(matchResponse.body.status, 'matched');

    const poolForMe = await request(app).get(`/discovery/pool?userId=${me.id}`);
    assert.ok(
      !poolForMe.body.some((candidate: { userId: string }) => candidate.userId === other.id),
      'matched candidate should no longer appear in discovery'
    );
  });
});
