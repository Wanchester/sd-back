import { QueryApi } from '@influxdata/influxdb-client';
import { readFileSync } from 'fs';
import interpole from 'string-interpolation-js';
import { resolve as pathResolve } from 'path';
import { callBasedOnRole, executeInflux, getPersonalInfoAPI } from './utils';
import { Express } from 'express';
import { SessionResponseType } from './interface';
import { getDuration } from './utilsInflux';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';
import { Database } from 'sqlite3';
import { getCoachTeamsAPI } from './team';

export async function getTrainingSessionStatisticsAPI(
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
    throwBasedOnCode('e400.9', teamName, sessionName);
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

export default function bindGetTrainingSessionStatistics(
  app: Express, 
  sqlDB: Database,
  queryClient: QueryApi) {
  // app.get('/trainingSessionStatistics', async (req, res) => {
  app.get('/trainingSessionsStats', async (req, res) => {
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

      // const teamName = (req.params as TrainingSessionsGetInterface).teamName;
      // const sessionName = (req.params as TrainingSessionsGetInterface).sessionName;
      const teamName = req.body.teamName;
      const sessionName = req.body.sessionName;

      let trainingSessionsAPI = await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          const playerList = await getTrainingSessionPlayerNamesAPI(queryClient, teamName, sessionName);
          console.log(loggedInPersonalInfo);
          if ( !playerList.includes(loggedInPersonalInfo.name )) {
            res.status(404).send({
              'name': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).name,
              'error': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).message,
            });
            return;
          }
          return getTrainingSessionStatisticsAPI(queryClient, teamName, sessionName);
        },
        async () => {
          let coachTeams = await getCoachTeamsAPI(sqlDB, queryClient, loggedInUsername);
          if (!coachTeams.includes(teamName)) {
            res.status(404).send({
              'name': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).name,
              'error': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).message,
            });
            return;
          }
          return getTrainingSessionStatisticsAPI(queryClient, teamName, sessionName);
        },
        async () => {
          return getTrainingSessionStatisticsAPI(queryClient, teamName, sessionName);
        },
      );
      res.send(trainingSessionsAPI);
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}
