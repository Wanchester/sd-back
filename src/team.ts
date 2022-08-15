import { readFileSync } from 'fs';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import {
  getPersonalInfoAPI,
  executeInflux,
  callBasedOnRole,
  getCommonTeams,
} from './utils';
import { resolve as pathResolve } from 'path';
import { QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';

export async function getPlayerTeamsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  const role = personalInfo.role; 
  if (role === 'player') {
    const PLAYER = personalInfo.name;
    //get the teams that the given player joined in
    let queryPlayerTeam = readFileSync(
      pathResolve(__dirname, '../../queries/players_teams.flux'),
      { encoding: 'utf8' },
    );
    queryPlayerTeam = interpole(queryPlayerTeam, [PLAYER]);
    //queryPlayerTeam = 'test exception';
    const teams = await executeInflux(queryPlayerTeam, queryClient);
    const cleanedTeams: string[] = [];

    for (let i = 0; i < teams.length; i++) {
      cleanedTeams.push(teams[i]._measurement);
    }
    return cleanedTeams;
  } else {
    throw new Error('cannot find a player with given username: ' + username);
  }
}

export async function getCoachTeamsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  const role = personalInfo.role; 
  if (role == 'coach') {
    const queryPlayerTeam = 'select teamName from TeamCoach where username = ?';
    // const queryPlayerTeam = 'test exception';
    const teams = await new Promise<any>((resolve, reject) => {
      db.all(queryPlayerTeam, [username], function (err, row) {
        // process the row here 
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    const cleanedTeams: string[] = [];
    for (let i = 0; i < teams.length; i++) {
      cleanedTeams.push(teams[i].teamName);
    }
    return cleanedTeams;

  } else {
    throw new Error('cannot find a coach with given username');
  }
}

export async function getTeamsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  const role = personalInfo.role; 
  let cleanedTeams: string[] = [];
  if (role == 'player') {
    cleanedTeams = await getPlayerTeamsAPI(db, queryClient, username);
  } else if (role == 'coach') {
    cleanedTeams = await getCoachTeamsAPI(db, queryClient, username);
  }
  return cleanedTeams;
}

//API return points
export default function bindGetTeams(
  app: Express,
  db: Database,
  queryClient: QueryApi,
) {
  app.get('/teams', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = sess.username;
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }
      
      // let username = CURRENTLY_LOGGED_IN;

      let teamsAPI = await getTeamsAPI(db, queryClient, loggedInUsername);
      res.send(teamsAPI);
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });

  app.get('/teams/:username', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = 'p_warren';
      // let loggedInUsername = CURRENTLY_LOGGED_IN; // username will be set to the username from session variable when log in feature is implemented
      //right now, just let the username = 'a_administrator' so that it has the right to see the teams list of all players.
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }
      
      let teamsAPI = (await callBasedOnRole(
        db,
        loggedInUsername!,
        async () => {
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to see the teams of player
          // return getPlayerTeamsAPI(db, queryClient, req.params.username);
          // currently, the coach can see the teams of all players and coach for testing purpose 
          let commonTeams = await getCommonTeams( db, queryClient, loggedInUsername!, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerTeamsAPI(db, queryClient, req.params.username);
          } else {
            throwBasedOnCode('e400.8');
          }
        },
        async () => {
          return getTeamsAPI(db, queryClient, req.params.username);
        },
      )) as any[];
      res.send(teamsAPI);
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}
