import { assert, expect } from 'chai';
import startExpressServer from '../src';
import request from 'supertest';

function assertSessionResponse(session: any) {
  assert.isObject(session);
  assert.isString(session.sessionName);
  assert.isString(session.sessionStart);
  assert.isString(session.sessionStop);
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
  
  // by pass the admin test case
  if (homepage.role == 'admin') {
    return;
  }
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

describe('Test Express server endpoints', async () => {
  const app = startExpressServer();

  // describe('No log in test', () => {
  //   const agent = request.agent(app);
  //   it('GET /profile endpoint without login', async () => {
  //     const res = await agent.get('/profile');
  //     expect(res.statusCode).to.equal(401);
  //     // assertHomepageResponse(res.body);
  //   });
  // });

  describe('Log in/out tests', () => {
    const agent = request.agent(app);

    it('GET /login returns 401 when the user has NOT logged in', async () => {
      const res = await agent.get('/login');
      expect(res.statusCode).to.equal(401);
    });

    it('POST /login fails on wrong username or password', async () => {
      const res = await agent.post('/login').send({
        username: 'false_username',
        password: 'false_password',
      });
      expect(res.statusCode).to.equal(400);
    });

    it('POST /logout succeeds even when not having logged in', async () => {
      const res = await agent.post('/logout');
      expect(res.statusCode).to.equal(200);
    });

    it('POST /login succeeds on correct username and password', async () => {
      const res = await agent.post('/login').send({
        username: 'a_administrator',
        password: '12345678',
      });
      expect(res.statusCode).to.equal(200);
      expect(res.body.username).to.equal('a_administrator');
    });

    it('GET /login returns logged-in user', async () => {
      const res = await agent.get('/login');
      expect(res.statusCode).to.equal(200);
      expect(res.body.loggedIn).to.equal('a_administrator');
    });

    it('POST /login fails after having logged in', async () => {
      const res = await agent.post('/login').send({
        username: 'dummy_user',
        password: 'dummy_pwd',
      });
      expect(res.statusCode).to.equal(400);
    });

    it('POST /logout succeeds with 200', async () => {
      const res = await agent.post('/logout');
      expect(res.statusCode).to.equal(200);
    });

    it('GET /login now fails because of not having logged in', async () => {
      const res = await agent.get('/login');
      expect(res.statusCode).to.equal(401);
    });
  });

  describe('Tests for p_jbk player', () => {
    const agent = request.agent(app);

    it('POST /login succeeds with p_jbk as logged in user', async () => {
      const testUser = {
        'username':'p_jbk',
        'password':'12345678',
      };
      const res = await agent.post('/login').send(testUser);
      expect(res.statusCode).to.equal(200);
    });

    // /profile
    it('GET /profile succeeds with p_jbk as logged in user', async () => {
      const res = await agent.get('/profile');
      expect(res.statusCode).to.equal(200);
      assertHomepageResponse(res.body);
    });

    it('GET /profile/:username fails with p_jbk as logged in user', async () => {
      const res = await agent.get('/profile/p_jbk');
      expect(res.statusCode).to.equal(401);
    });

    // /teams
    it('GET /teams succeeds with p_jbk as logged in user', async () => {
      const res = await agent.get('/teams');
      expect(res.statusCode).to.equal(200);
      assertTeamResponse(res.body);
    });

    it('GET /teams/:username fails with p_jbk as logged in user', async () => {
      const res = await agent.get('/teams/p_jbk');
      expect(res.statusCode).to.equal(401);
    });

    // /trainingSessions
    it('GET /trainingSessions succeeds with p_jbk as logged in user', async () => {
      const res = await agent.get('/trainingSessions');
      expect(res.statusCode).to.equal(200);
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    });

    it('GET /trainingSessions/:username fails with p_jbk as logged in user', async () => {
      const res = await request(app).get('/trainingSessions/p_warren');
      expect(res.statusCode).to.equal(401);
    });
  });

  describe('Tests for a_administrator admin', () => {
    const agent = request.agent(app);

    it('POST /login succeeds with a_administrator as logged in user', async () => {
      const testUser = {
        'username':'a_administrator',
        'password':'12345678',
      };
      const res = await agent.post('/login').send(testUser);
      expect(res.statusCode).to.equal(200);
    });

    // /profile
    it('GET /profile succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/profile');
      expect(res.statusCode).to.equal(200);
      assertHomepageResponse(res.body);
    });

    it('GET /profile/:username succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/profile/p_jbk');
      expect(res.statusCode).to.equal(200);
      assertHomepageResponse(res.body);
    });

    // /teams
    it('GET /teams succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/teams');
      expect(res.statusCode).to.equal(200);
      assertTeamResponse(res.body);
    });

    it('GET /teams/:username succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/teams/p_jbk');
      expect(res.statusCode).to.equal(200);
      assertTeamResponse(res.body);
    });

    // /trainingSessions
    it('GET /trainingSessions succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/trainingSessions');
      expect(res.statusCode).to.equal(200);
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    });

    it('GET /trainingSessions/:username succeeds with a_administrator as logged in user', async () => {
      const res = await request(app).get('/trainingSessions/p_warren');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      (res.body as any[]).forEach(session => assertSessionResponse(session));
    });
  });
});
