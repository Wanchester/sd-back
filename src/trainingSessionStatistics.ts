import { QueryApi } from '@influxdata/influxdb-client';
import { readFileSync } from 'fs';
import interpole from 'string-interpolation-js';
import { resolve as pathResolve } from 'path';
import { callBasedOnRole, CURRENTLY_LOGGED_IN, executeInflux, getPersonalInfoAPI } from './utils';
import { Express, query } from 'express';
import { SessionResponseType } from './interface';
import { getDuration } from './utilsInflux';
import throwBasedOnCode, { generateErrorBasedOnCode } from './throws';
import { Database } from 'sqlite3';

export async function getTrainingSessionStatisticAPI(
  queryClient: QueryApi,
  teamName: string, 
  sessionName: string,
) {
  let queryTrainingSessionStatistic = readFileSync(
    pathResolve(__dirname, '../../queries/trainingSessionStatistics.flux'),
    { encoding: 'utf8' },
  );
  queryTrainingSessionStatistic = interpole(queryTrainingSessionStatistic, [teamName, sessionName]);
  const trainingSessionStatistics = await executeInflux(queryTrainingSessionStatistic, queryClient);

  if (Object.keys(trainingSessionStatistics).length === 0) {
    throwBasedOnCode('e404.5', teamName, sessionName);
  }
  const trainingSessionStatistic: any  = trainingSessionStatistics[0];

  const aSession = {
    sessionName: '',
    sessionStart: '',
    sessionStop: '',
    teamName: '',
    duration: '',
  } as SessionResponseType;

  aSession.sessionName = trainingSessionStatistic.Session;
  aSession.sessionStart = trainingSessionStatistic._start;
  aSession.sessionStop = trainingSessionStatistic._stop;
  aSession.teamName = trainingSessionStatistic._measurement;
  aSession.duration = getDuration(trainingSessionStatistic._start, trainingSessionStatistic._stop);

  return aSession;
}

export async function getTrainingSessionPlayerNamesAPI(queryClient:QueryApi, teamName: string, sessionName: string) {
  let queryTrainingSessionPlayers = readFileSync(
    pathResolve(__dirname, '../../queries/trainingSession_players.flux'),
    { encoding: 'utf8' },
  );
  queryTrainingSessionPlayers = interpole(queryTrainingSessionPlayers, [teamName, sessionName]);
  const players = await executeInflux(queryTrainingSessionPlayers, queryClient);
  const playerList: string[] = [];
  // console.log(players);
  for (const i in players) {
    playerList.push(players[i]['Player Name']);
  }
  return playerList;
}


export default function bindGetTrainingSessionStatistic(
  app: Express, 
  sqlDB: Database,
  queryClient: QueryApi) {
  app.get('/trainingSessionStatistic', async (req, res) => {
    try {
      const loggedInUsername = req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      const loggedInPersonalInfo = await getPersonalInfoAPI(sqlDB, loggedInUsername);

      const teamName = req.body.teamName;
      const sessionName = req.body.sessionName;

      let trainingSessionsAPI = (await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          const playerList = await getTrainingSessionPlayerNamesAPI(queryClient, teamName, sessionName);
          console.log(loggedInPersonalInfo);
          if ( !playerList.includes(loggedInPersonalInfo.name )) {
            res.status(404).send({
              'name': generateErrorBasedOnCode('e404.6', loggedInUsername, teamName, sessionName).name,
              'error': generateErrorBasedOnCode('e404.6', loggedInUsername, teamName, sessionName).message,
            });
          }
          return getTrainingSessionStatisticAPI(queryClient, teamName, sessionName);
        },
        // async () => {
        //   // the coach should only be able to see the training sessions of player
        //   // currently, the coach can see the training sessions of all players and coach for testing purpose 
        //   let commonTeams = await getCommonTeams( db, queryClient, loggedInUsername!, req.params.username);
        //   if (commonTeams.length !== 0) {
        //     return getPlayerTrainingSessionsAPI(db, queryClient, req.params.username);
        //   } else {
        //     throw new Error('Cannot find the input username in your teams');
        //   }
        // },
        // async () => {
        //   return getTrainingSessionsAPI(db, queryClient, req.params.username);
        // },
      )) as any[];
      
      



      res.send(trainingSessionsAPI);
    } catch (error) {
      res.status(500).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}