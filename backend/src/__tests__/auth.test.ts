import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../prisma.js';

describe('auth', () => {
  const createdUserIds: string[] = [];

  after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it('rejects request-code without email or phone', async () => {
    const response = await request(app).post('/auth/request-code').send({});
    assert.equal(response.status, 400);
  });

  it('creates a new user after a full email verify-code cycle', async () => {
    const email = `test-${randomUUID()}@example.com`;

    const requestResponse = await request(app).post('/auth/request-code').send({ email });
    assert.equal(requestResponse.status, 200);

    const loginCode = await prisma.loginCode.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(loginCode, 'expected a LoginCode row to be created');

    const verifyResponse = await request(app)
      .post('/auth/verify-code')
      .send({ email, code: loginCode!.code });
    assert.equal(verifyResponse.status, 200);
    assert.equal(verifyResponse.body.email, email);
    assert.equal(verifyResponse.body.termsAcceptedAt, null);
    createdUserIds.push(verifyResponse.body.id);
  });

  it('rejects verify-code with a wrong code', async () => {
    const email = `test-${randomUUID()}@example.com`;
    await request(app).post('/auth/request-code').send({ email });

    const response = await request(app)
      .post('/auth/verify-code')
      .send({ email, code: '000000' });
    assert.equal(response.status, 400);
  });

  it('creates a new user after a full phone verify-code cycle', async () => {
    const phone = `+1555${Math.floor(1000000 + Math.random() * 8999999)}`;

    await request(app).post('/auth/request-code').send({ phone });
    const loginCode = await prisma.loginCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(loginCode, 'expected a LoginCode row to be created for phone');

    const verifyResponse = await request(app)
      .post('/auth/verify-code')
      .send({ phone, code: loginCode!.code });
    assert.equal(verifyResponse.status, 200);
    assert.equal(verifyResponse.body.phone, phone);
    assert.equal(verifyResponse.body.email, null);
    createdUserIds.push(verifyResponse.body.id);
  });
});
