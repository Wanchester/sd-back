import { readFileSync } from 'fs';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import {
  getPersonalInfoAPI,
  executeInflux,
  DEFAULT_USERNAME,
  callBasedOnRole,
  SQLretrieve,
} from './utils';
import { resolve as pathResolve } from 'path';
import { consoleLogger, QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';
import { hasUncaughtExceptionCaptureCallback } from 'process';

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
  if (role == 'player') {
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
  } else if (role == 'coach') {
    // const queryPlayerTeam = 'select teamName from TeamCoach where username = ?';
    const queryPlayerTeam = 'test exceptopn';
    // async function testFunction() {
    //   db.get(queryPlayerTeam, [username], (err, row) => {
    //     // process the row here 
    //     if (err) {
    //       //throw new Error('hehe');
    //       console.log('haha');
    //       return err;
    //     } else {
    //       console.log(row);
    //     }
    //   });
    // }
    const cleanedTeams = await new Promise<void>((resolve, reject) => {
      db.get(queryPlayerTeam, [username], function (err, row) {
        // process the row here 
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    }).catch(function (err) {
      throw err;
    });

    
    // let teams; 
    // teams = await SQLretrieve(db, queryPlayerTeam, [username]);
    // const cleanedTeams: string[] = [];
    // for (let i = 0; i < teams.length; i++) {
    //   cleanedTeams.push(teams[i].teamName);
    // }
    return cleanedTeams;

  }
  

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
      let username = DEFAULT_USERNAME;

      let teamsAPI = await getTeamsAPI(db, queryClient, username);
      res.send(teamsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });

  app.get('/teams/:username', async (req, res) => {
    try {
      // const sess = req.session;
      let username = 'coach1'; // username will be set to the username from session variable when log in feature is implemented
      //right now, just let the username = 'coach1' so that it has the right to see the teams list of all players.
      let teamsAPI = (await callBasedOnRole(
        db,
        username!,
        () => {
          throw new Error('You are not allowed to make the request');
        },
        async () => {
          return getTeamsAPI(db, queryClient, req.params.username);
        },
        async () => {
          return getTeamsAPI(db, queryClient, req.params.username);
        },
      )) as any[];
      console.log(teamsAPI);
      res.send(teamsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}
