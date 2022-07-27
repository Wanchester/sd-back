import { assert, expect } from 'chai';
import startExpressServer from '../src';
import request from 'supertest';

function assertSessionResponse(session: any) {
  assert.isObject(session);
  assert.isString(session.sessionName);
  assert.isString(session.sessionDate);
  assert.isString(session.sessionTime);
  assert.isString(session.teamName);
  assert.isString(session.duration);
}

function assertHomepageResponse(homepage: any) {
  assert.isObject(homepage);
  assert.isString(homepage.username);
  assert.isString(homepage.name);
  assert.isString(homepage.email);
  assert.isString(homepage.dob);
  assert.isString(homepage.nationality);
  assert.isNumber(homepage.height);
  assert.isNumber(homepage.weight);
  assert.oneOf(homepage.role, ['admin', 'coach', 'player']);
  assert.isArray(homepage.teams);
  (homepage.teams as any[]).forEach((value) => assert.isString(value));
  assert.isArray(homepage.trainingSessions);
  (homepage.trainingSessions as any[]).forEach((value) =>
    assertSessionResponse(value),
  );
}

function assertTeamResponse(team: any) {
  assert.isArray(team);
  team.forEach((value: any) => assert.isString(value));
}

describe('Test Express server endpoints', () => {
  const app = startExpressServer();

  it('GET /profile endpoint', async () => {
    const res = await request(app).get('/profile');
    expect(res.statusCode).to.equal(200);
    assertHomepageResponse(res.body);
  });

  it('GET /profile/:username endpoint', async () => {
    const res = await request(app).get('/profile/p_jbk');
    expect(res.statusCode).to.equal(200);
    assertHomepageResponse(res.body);
  });

  it('GET /teams endpoint', async () => {
    const res = await request(app).get('/teams');
    expect(res.statusCode).to.equal(200);
    assertTeamResponse(res.body);
  });

  it('GET /teams/username endpoint', async () => {
    const res = await request(app).get('/teams/p_jbk');
    expect(res.statusCode).to.equal(200);
    assertTeamResponse(res.body);
  });



});
