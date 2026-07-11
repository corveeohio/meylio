import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../prisma.js';

describe('users', () => {
  const createdUserIds: string[] = [];

  after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  async function createUser() {
    const user = await prisma.user.create({ data: { email: `test-${randomUUID()}@example.com` } });
    createdUserIds.push(user.id);
    return user;
  }

  it('reports an unused display name as available', async () => {
    const response = await request(app).get(
      `/users/check-display-name?name=${randomUUID().slice(0, 12)}`
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.available, true);
  });

  it('reports an already-taken display name as unavailable', async () => {
    const user = await createUser();
    const name = `taken-${randomUUID().slice(0, 8)}`;
    await request(app).patch(`/users/${user.id}`).send({ displayName: name });

    const response = await request(app).get(`/users/check-display-name?name=${name}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.available, false);
  });

  it('locks the display name after it is first set', async () => {
    const user = await createUser();

    const first = await request(app)
      .patch(`/users/${user.id}`)
      .send({ displayName: `name-${randomUUID().slice(0, 8)}` });
    assert.equal(first.status, 200);

    const second = await request(app)
      .patch(`/users/${user.id}`)
      .send({ displayName: `other-${randomUUID().slice(0, 8)}` });
    assert.equal(second.status, 403);
  });

  it('rejects setting a display name shorter than 2 characters', async () => {
    const user = await createUser();
    const response = await request(app).patch(`/users/${user.id}`).send({ displayName: 'a' });
    assert.equal(response.status, 400);
  });
});
