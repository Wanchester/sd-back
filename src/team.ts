import { readFileSync } from 'fs';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import { getPersonalInfoAPI, executeInflux } from './utils';
import { resolve as pathResolve } from 'path';
import { QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';

const DEFAULT_USERNAME = 'warren';

export async function getJoinedTeamAPI(db: Database, queryClient: QueryApi, username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let PLAYER = personalInfo[0].name;
  //get the teams that the given player joined in
  let queryPlayerTeam = readFileSync(pathResolve(__dirname, '../../queries/players_teams.flux'), { encoding: 'utf8' });
  queryPlayerTeam = interpole(queryPlayerTeam, [PLAYER]);
  //let queryPlayerTeam = 'test exception';
  const teams = await executeInflux(queryPlayerTeam, queryClient);
  const cleanedTeams: string[] = [];

  for (let i = 0; i < teams.length; i++) {
    cleanedTeams.push(teams[i]._measurement);
  }
  return cleanedTeams;
}

export default function bindGetTeams(app: Express, db: Database, queryClient: QueryApi) {
  app.get('/teams', async (req, res) => {
    try {
      let username = DEFAULT_USERNAME;
      let joinedTeamAPI = await getJoinedTeamAPI(db, queryClient, username);
      res.send(joinedTeamAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  });

  app.get('/teams/:username', async (req, res) => {
    try {
      let username  = req.params.username;
      let joinedTeamAPI = await getJoinedTeamAPI(db, queryClient, username);
      res.send(joinedTeamAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  });
}









