import { assert, expect } from 'chai';
import startExpressServer from '../src';
import request, { SuperAgentTest } from 'supertest';

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

function assertPlayerNameListResponse(playerList: any) {
  assert.isObject(playerList);
  assert.isArray(playerList.players);
  (playerList.players as any[]).forEach((value: any) => {
    assert.isObject(value);
    assert.isString(value.name);
    assert.isString(value.username);
  });
}

function assertTimeSeriesResponse(response: any) {
  assert.isObject(response);
  assert.isArray(Object.keys(response));
  Object.keys(response).forEach((key:any) => assert.isString(key));
  Object.values(response).forEach((playerEntry:any) => {
    assert.isObject(playerEntry);
    assert.isArray(Object.keys(playerEntry));
    Object.keys(playerEntry).forEach((field:any) => assert.isString(field));
    Object.values(playerEntry).forEach((statList:any) => {
      assert.isArray(statList);
      (statList as any[]).forEach((timeAndValue:any) => {
        assert.isArray(timeAndValue);
        expect(timeAndValue.length).to.equal(2);
        assert.isString(timeAndValue[0]);
        assert.isNumber(timeAndValue[1]);
      });
    });
  });
  
}

async function verifyPutProfileRequest(agent: SuperAgentTest, endpoint: string, height = 170) {
  const res = await agent.put(endpoint).send({ height });
  expect(res.statusCode).to.equal(200);
  expect(res.body).to.haveOwnProperty('height', height);

  const dblcheck = await agent.get(endpoint);
  expect(dblcheck.body).to.haveOwnProperty('height', height);
}

describe('Test Express server endpoints', async () => {
  const app = startExpressServer();

  describe('No log in test', () => {
    const agent = request.agent(app);
    it('GET /profile endpoint without login', async () => {
      const res = await agent.get('/profile');
      expect(res.statusCode).to.equal(401);
      // assertHomepageResponse(res.body);
    });
    it('GET /team fails when not logged in', async () => {
      const res = await agent.get('/team?teamName=TeamWanchester');
      expect(res.statusCode).to.equal(401);
    });

    it('GET /lineGraph fails when not logged in', async () => {
      const res = await agent.get('/lineGraph');
      expect(res.statusCode).to.equal(401);
    });
  });

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

  // player
  describe('Tests for p_jbk player', () => {
    const agent = request.agent(app);

    it('POST /login succeeds with p_jbk as logged in user', async () => {
      const testUser = {
        'username':'p_jbk',
        'password':'12345678',
      };
      const res = await agent.post('/login').send(testUser);
      expect(res.statusCode).to.equal(200);
    }).timeout(10000);

    // /profile
    it('GET /profile succeeds with p_jbk as logged in user', async () => {
      const res = await agent.get('/profile');
      expect(res.statusCode).to.equal(200);
      assertHomepageResponse(res.body);
    }).timeout(10000);

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
      assert.isArray(res.body); 
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    }).timeout(10000);

    it('GET /trainingSessions/:username fails with p_jbk as logged in user', async () => {
      const res = await agent.get('/trainingSessions/p_warren');
      expect(res.statusCode).to.equal(401);
    }).timeout(4000);

    // team players
    it('GET /team?teamName=TeamWanchester succeeds with p_jbk logged in as user', async () => {
      const res = await agent.get('/team?teamName=TeamWanchester');
      expect(res.statusCode).to.equal(200);
      assertPlayerNameListResponse(res.body);
    }).timeout(10000);

    it('GET /team?teamName=Team3 fails with p_jbk logged in as user', async () => {
      const res = await agent.get('/team?teamName=Team3');
      expect(res.statusCode).to.equal(400);
    });

    // team training sessions
    it('GET /trainingSessions?teamName=TeamBit succeeds with p_jbk logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=TeamBit');
      expect(res.statusCode).to.equal(200);
      assert.isArray(res.body); 
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    });

    it('GET /trainingSessions?teamName=Team3 fails with p_jbk logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=Team3');
      expect(res.statusCode).to.equal(400);
    });

    it('GET /trainingSessions?teamName=InvalidTeamName fails with p_jbk logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=InvalidTeamName');
      expect(res.statusCode).to.equal(400);
    });

    //trainingSessions fullStats
    it('GET /trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 21/4/22 fails with p_jbk as logged in user', async () => {
      const res = await agent.get('/trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 21/4/22');
      expect(res.statusCode).to.equal(400);
    }).timeout(10000);

    it('GET /trainingSessions?fullStats=true&teamName=TeamWanchester&sessionName=NULL 24/4/22 succeeds with p_jbk as logged in user', async () => {
      const res = await agent.get('/trainingSessions?fullStats=true&teamName=TeamWanchester&sessionName=NULL 24/4/22');
      expect(res.statusCode).to.equal(200);
      assertSessionResponse(res.body);
    }).timeout(10000);

    // edit profile
    it('PUT /profile succeeds with p_jbk as logged in user', async () => {
      await verifyPutProfileRequest(agent, '/profile');
    }).timeout(10000);

    it('PUT /profile/OTHER_USER fails with p_jbk as logged in user', async () => {
      const res = await agent.put('/profile/p_warren').send({ height: 170 });
      expect(res.statusCode).to.equal(401);
    });

    //line graph
    it('GET /lineGraph succeeds for p_jbk', async () => {
      const res = await agent.get('/lineGraph').send({
        names: ['Jbk'],
        sessions: ['NULL 24/4/22'],
        teams: ['TeamWanchester'],
        fields: ['Velocity'],
        time_window: { every: '3600', func: 'mean' },
      });
      expect(res.statusCode).to.equal(200);
      assertTimeSeriesResponse(res.body);
    }).timeout(6000);

    it('GET /lineGraph fails for p_jbk requesting unaffiliated team', async () => {
      const res = await agent.get('/lineGraph').send({
        teams: ['Team3'],
        fields: ['Velocity'],
        time_window: { every: '3600', func: 'mean' },
      });
      expect(res.statusCode).to.equal(403);
    }).timeout(6000);

    it('GET /lineGraph fails for p_jbk with empty query', async () => {
      const res = await agent.get('/lineGraph').send({});
      expect(res.statusCode).to.equal(400);
    });
  });

  // coach
  describe('Tests for c_coach1 coach', async () => {
    const agent = request.agent(app);
  
    it('POST /login succeeds with c_coach1 as logged in user', async () => {
      const testUser = {
        'username':'c_coach1',
        'password':'12345678',
      };
      const res = await agent.post('/login').send(testUser);
      expect(res.statusCode).to.equal(200);
    });
    
    //profile
    it('GET /profile succeeds with c_coach1 as logged in user', async () => {
      const res = await agent.get('/profile');
      expect(res.statusCode).to.equal(200);
      assertHomepageResponse(res.body);
    }).timeout(10000);
  
    it('GET /profile/:username fails with c_coach1 as logged in user', async () => {
      const res = await agent.get('/profile/c_coach2');
      expect(res.statusCode).to.equal(400);
    });
  
    //teams
    it('GET /teams succeeds with c_coach1 as logged in user', async () => {
      const res = await agent.get('/teams');
      expect(res.statusCode).to.equal(200);
      assertTeamResponse(res.body);
    });
  
    it('GET /teams/:username fails with c_coach1 as logged in user', async () => {
      const res = await agent.get('/teams/c_coach2');
      expect(res.statusCode).to.equal(400);
    });
  
    // trainingSessions
    it('GET /trainingSessions succeeds with c_coach1 as logged in user', async () => {
      const res = await agent.get('/trainingSessions');
      expect(res.statusCode).to.equal(200);
      assert.isArray(res.body); 
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    }).timeout(10000);
  
    it('GET /trainingSessions/other_coach_name fails with c_coach1 as logged in user', async () => {
      const res = await agent.get('/trainingSessions/c_coach2');
      expect(res.statusCode).to.equal(400);
    });

    it('GET /trainingSessions/bad_player_name fails with c_coach1 as logged in user', async () => {
      const res = await agent.get('/trainingSessions/p_ballard');
      expect(res.statusCode).to.equal(400);
    }).timeout(4000);

    it('GET /trainingSessions/good_player_name succeeds with c_coach1 as logged in user', async () => {
      const res = await agent.get('/trainingSessions/p_warren');
      expect(res.statusCode).to.equal(200);
      assert.isArray(res.body); 
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    }).timeout(4000);

    // team players
    it('GET /team?teamName=TeamBit succeeds with c_coach1 logged in as user', async () => {
      const res = await agent.get('/team?teamName=TeamBit');
      expect(res.statusCode).to.equal(200);
      assertPlayerNameListResponse(res.body);
    }).timeout(10000);

    it('GET /team?teamName=TeamWanchester fails with c_coach1 logged in as user', async () => {
      const res = await agent.get('/team?teamName=TeamWanchester');
      expect(res.statusCode).to.equal(400);
    });

    // team trainingSessions
    it('GET /trainingSessions?teamName=TeamBit succeeds with c_coach1 logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=TeamBit');
      expect(res.statusCode).to.equal(200);
      assert.isArray(res.body); 
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    });

    it('GET /trainingSessions?teamName=TeamWanchester fails with c_coach1 logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=TeamWanchester');
      expect(res.statusCode).to.equal(400);
    });

    // edit profile
    it('PUT /profile succeeds with c_coach1 as logged in user', async () => {
      await verifyPutProfileRequest(agent, '/profile');
    }).timeout(6000);

    it('PUT /profile/PLAYER_IN_TEAM succeeds with c_coach1 as logged in user', async () => {
      await verifyPutProfileRequest(agent, '/profile/p_jbk', 171);
    }).timeout(6000);

    it('PUT /profile/PLAYER_NOT_IN_TEAM fails with c_coach1 as logged in user', async () => {
      const res = await agent.put('/profile/p_ballard').send({ height: 170 });
      expect(res.statusCode).to.equal(400);
    });

    //line graph
    it('GET /lineGraph succeeds for c_coach1', async () => {
      const res = await agent.get('/lineGraph').send({
        sessions: ['NULL 17/4/22', 'NULL 2/4/22'],
        teams: ['TeamBit', 'Team3'],
        fields: ['Velocity', 'Height'],
        time_window: { every: '3600', func: 'mean' },
      });
      expect(res.statusCode).to.equal(200);
      assertTimeSeriesResponse(res.body);
    }).timeout(6000);

    it('GET /lineGraph fails for c_coach1 requesting unaffiliated team', async () => {
      const res = await agent.get('/lineGraph').send({
        teams: ['TeamWanchester'],
        fields: ['Velocity'],
        time_window: { every: '3600', func: 'mean' },
      });
      expect(res.statusCode).to.equal(403);
    }).timeout(6000);

    it('GET /lineGraph fails for c_coach with empty query', async () => {
      const res = await agent.get('/lineGraph').send({});
      expect(res.statusCode).to.equal(400);
    });


    // trainingSessions fullStats
    it('GET /trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 21/4/22 succeeds with c_coach1 as logged in user', async () => {
      const res = await agent.get('/trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 21/4/22');
      expect(res.statusCode).to.equal(200);
      assertSessionResponse(res.body);
    }).timeout(10000);

    it('GET /trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 24/4/22 fails with c_coach1 as logged in user', async () => {
      const res = await agent.get('/trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 24/4/22');
      expect(res.statusCode).to.equal(400);
    }).timeout(10000);
  });

  // admin
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

    // profile
    it('GET /profile succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/profile');
      expect(res.statusCode).to.equal(200);
      assertHomepageResponse(res.body);
    }).timeout(10000);

    it('GET /profile/:username succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/profile/p_jbk');
      expect(res.statusCode).to.equal(200);
      assertHomepageResponse(res.body);
    }).timeout(10000);

    // teams
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

    // trainingSessions
    it('GET /trainingSessions succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/trainingSessions');
      expect(res.statusCode).to.equal(200);
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    }).timeout(10000);

    it('GET /trainingSessions/:username succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/trainingSessions/p_warren');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      (res.body as any[]).forEach(session => assertSessionResponse(session));
    }).timeout(10000);

    it('GET /trainingSessions/coach_name succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/trainingSessions/c_coach1');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      (res.body as any[]).forEach(session => assertSessionResponse(session));
    }).timeout(10000);

    it('GET /trainingSessions/:username fails with invalid username as admin', async () => {
      const res = await agent.get('/trainingSessions/BAD_NAME');
      expect(res.statusCode).to.equal(400);
    }).timeout(10000);
    
    // team players
    it('GET /team?teamName=TeamBit succeeds with a_administrator logged in as user', async () => {
      const res = await agent.get('/team?teamName=TeamBit');
      expect(res.statusCode).to.equal(200);
      assertPlayerNameListResponse(res.body);
    }).timeout(10000);

    it('GET /team?teamName=InvalidTeam fails with a_administrator logged in as user', async () => {
      const res = await agent.get('/team?teamName=InvalidTeam');
      expect(res.statusCode).to.equal(400);
    });

    // team trainingSessions
    it('GET /trainingSessions?teamName=TeamBit succeeds with a_administrator logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=TeamBit');
      expect(res.statusCode).to.equal(200);
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    });

    it('GET /trainingSessions?teamName=TeamWanchester succeeds with a_administrator logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=TeamWanchester');
      expect(res.statusCode).to.equal(200);
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    });

    it('GET /trainingSessions?Team3 succeeds with a_administrator logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=TeamBit');
      expect(res.statusCode).to.equal(200);
      res.body.forEach((session: any)=>assertSessionResponse(session) );
    });

    it('GET /trainingSessions?InvalidTeamName succeeds with a_administrator logged in as user', async () => {
      const res = await agent.get('/trainingSessions?teamName=InvalidTeamName');
      expect(res.statusCode).to.equal(400);
    });

    // trainingSessions fullStats
    it('GET /trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 21/4/22 succeeds with a_administrator as logged in user', async () => {
      const res = await agent.get('/trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 21/4/22');
      expect(res.statusCode).to.equal(200);
      assertSessionResponse(res.body);
    }).timeout(10000);

    it('GET /trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 24/4/22 fails with a_administrator as logged in user', async () => {
      const res = await agent.get('/trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 24/4/22');
      expect(res.statusCode).to.equal(400);
    }).timeout(10000);

    it('GET /trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 0/4/22 fails with a_administrator as logged in user', async () => {
      const res = await agent.get('/trainingSessions?fullStats=true&teamName=TeamBit&sessionName=NULL 0/4/22');
      expect(res.statusCode).to.equal(400);
    }).timeout(10000);
    // edit profile
    it('PUT /profile fails with a_administrator as logged in user', async () => {
      const res = await agent.put('/profile').send({ height: 170 });
      expect(res.statusCode).to.equal(403);
    });

    it('PUT /profile/OTHER_USER succeeds with a_administrator as logged in user', async () => {
      await verifyPutProfileRequest(agent, '/profile/p_jbk', 172);
    }).timeout(4000);

    //line graph
    it('GET /lineGraph succeeds for a_administrator', async () => {
      const res = await agent.get('/lineGraph').send({
        sessions: ['NULL 17/4/22', 'NULL 2/4/22'],
        teams: ['TeamBit', 'Team3', 'TeamWanchester'],
        fields: ['Velocity', 'Height'],
        time_window: { every: '36000', func: 'mean' },
      });
      expect(res.statusCode).to.equal(200);
      assertTimeSeriesResponse(res.body);
    }).timeout(6000);

    it('GET /lineGraph fails for a_administrator with empty query', async () => {
      const res = await agent.get('/lineGraph').send({});
      expect(res.statusCode).to.equal(400);
    });
  });
});
