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
import { buildQuery } from './utilsInflux';

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
    // throw new Error('cannot find a player with given username: ' + username);
    throwBasedOnCode('e400.4');
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
    // throw new Error('cannot find a coach with given username');
    throwBasedOnCode('e400.5');
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

export async function getAllTeamsAPI(queryClient: QueryApi) {
  const getTeamQuery = buildQuery({ get_unique: 'teams' } );
  const team = await executeInflux(getTeamQuery, queryClient);
  const teamsList: string[] = [];
  team.forEach(row => 
    teamsList.push(row._measurement),
  );
  return teamsList;
}

export async function isValidTeam(queryClient: QueryApi, teamName: string) {
  const allTeams = await getAllTeamsAPI(queryClient);
  if ( allTeams.includes(teamName) ) {
    return true;
  }
  return false;
}

//API return points
export default function bindGetTeams(
  app: Express,
  db: Database,
  queryClient: QueryApi,
) {
  app.get('/teams', async (req, res) => {
    try {
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }
      
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
      // username is set to the username from session variable
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }
      const queriedUsername = req.params.username;
      let teamsAPI = (await callBasedOnRole(
        db,
        loggedInUsername!,
        async () => {
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to see the teams of player
          let commonTeams = await getCommonTeams( db, queryClient, loggedInUsername!, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerTeamsAPI(db, queryClient, req.params.username);
          } else {
            throwBasedOnCode('e400.8', queriedUsername);
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
