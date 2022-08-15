import { QueryApi } from '@influxdata/influxdb-client';
import { readFileSync } from 'fs';
import moment from 'moment';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import { getPersonalInfoAPI, executeInflux, callBasedOnRole, getCommonTeams } from './utils';
import { resolve as pathResolve } from 'path';
import { SessionResponseType } from './interface';
import { Express } from 'express';
import { getCoachTeamsAPI } from './team';
import { getDuration } from './utilsInflux';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';
import { getTrainingSessionPlayerNamesAPI, getTrainingSessionStatisticsAPI } from './trainingSessionStatistics';

export async function getTeamTrainingSessionsAPI(
  queryClient: QueryApi,
  teamName: string,
) {
  let teamTrainingSessionsQuery = readFileSync(
    pathResolve(__dirname, '../../queries/team_sessions.flux'),
    { encoding: 'utf8' },
  );
  teamTrainingSessionsQuery = interpole(teamTrainingSessionsQuery, [teamName]);
  const trainingSessions = await executeInflux(teamTrainingSessionsQuery, queryClient);
  const cleanedTrainingSessions: any[] = [];
  for (let i = 0; i < trainingSessions.length; i++) {
    const aSession = {
      playerName: '',
      sessionName: '',
      sessionStart: '',
      sessionStop: '',
      teamName: '',
      duration: '',
    } as SessionResponseType;
    aSession.sessionName = trainingSessions[i].Session;
    aSession.sessionStart = trainingSessions[i]._start;    //DateOfMonth-Month-Year. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
    aSession.sessionStop = trainingSessions[i]._stop;          //24HoursFormat:minutes. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
    aSession.teamName = trainingSessions[i]._measurement;
    // aSession.duration = TimeFormat.fromS(trainingSessions[i].elapsed, 'hh:mm:ss');     //hour:minutes:seconds.See https://github.com/Goldob/hh-mm-ss#supported-time-formats
    aSession.duration = getDuration(trainingSessions[i]._start, trainingSessions[i]._stop);
    cleanedTrainingSessions.push(aSession);
  }
  return cleanedTrainingSessions;
}

export async function getPlayerTrainingSessionsAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role == 'player') {
    //get the information of all the training sessions of given players
    let queryPlayerSession = readFileSync(
      pathResolve(__dirname, '../../queries/players_sessions.flux'),
      { encoding: 'utf8' },
    );

    queryPlayerSession = interpole(queryPlayerSession, [personalInfo.name]);
    const trainingSessions = await executeInflux(queryPlayerSession, queryClient);
    const cleanedTrainingSessions: any[] = [];
    for (let i = 0; i < trainingSessions.length; i++) {
      const aSession = {
        sessionName: '',
        sessionStart: '',
        sessionStop: '',
        teamName: '',
        duration: '',
      } as SessionResponseType;
      aSession.sessionName = trainingSessions[i].Session;
      aSession.sessionStart = trainingSessions[i]._start;   //DateOfMonth-Month-Year. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
      aSession.sessionStop = trainingSessions[i]._stop;        //24HoursFormat:minutes. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
      aSession.teamName = trainingSessions[i]._measurement;
      // aSession.duration = TimeFormat.fromS(trainingSessions[i].elapsed, 'hh:mm:ss');     //hour:minutes:seconds.See https://github.com/Goldob/hh-mm-ss#supported-time-formats
      aSession.duration = getDuration(trainingSessions[i]._start, trainingSessions[i]._stop);
      cleanedTrainingSessions.push(aSession);
    }
    return cleanedTrainingSessions;
  } else {
    // throw new Error('cannot find player with given username');
    throwBasedOnCode('e400.4');
  }
}

export async function getCoachTrainingSessionsAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role == 'coach') {
    // get all the teams of given coach's username
    let teams = await getCoachTeamsAPI(sqlDB, queryClient, username);
    let teamsTrainingSessions: any[] = []; 
    // for each of team in teams, get all training sessions of that team
    for (let i = 0; i < teams.length;  i++) {
      let trainingSessions = await getTeamTrainingSessionsAPI(queryClient, teams[i]);
      teamsTrainingSessions.push(...trainingSessions);
    }
    return teamsTrainingSessions;
  } else {
    // throw new Error('cannot find coach with given username');
    throwBasedOnCode('e400.5');
  }
}

export async function getTrainingSessionsAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  username: string,
) {
  const personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role == 'player') {
    let trainingSessions = await getPlayerTrainingSessionsAPI(sqlDB, queryClient, username);
    return trainingSessions;
  } else if (personalInfo.role == 'coach') {
    let trainingSessions = await getCoachTrainingSessionsAPI(sqlDB, queryClient, username);
    return trainingSessions;
  }
}

export default function bindGetTrainingSessions(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  // app.get('/trainingSessions?fullStats=:fullStats&teamName=:teamName&sessionName=:sessionName', async (req, res) => {
  app.get('/trainingSessions', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = sess.username;
      // let username = CURRENTLY_LOGGED_IN;
      console.log('query', req.query);
      if ((req.query as any).fullStats) {
        const loggedInUsername = req.session.username;
        if (loggedInUsername === undefined) {
          res.status(401).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e401.0').message,
          });
          return;
        }
        const loggedInPersonalInfo = await getPersonalInfoAPI(sqlDB, loggedInUsername);
  
        const teamName = (req.query as any).teamName;
        const sessionName = (req.query as any).sessionName;
        // const teamName = req.body.teamName;
        // const sessionName = req.body.sessionName;
  
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
      } else {
        let loggedInUsername =  req.session.username;
        if (loggedInUsername === undefined) {
          res.status(401).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e401.0').message,
          });
          return;
        }

        let trainingSessionsAPI = await getTrainingSessionsAPI(
          sqlDB,
          queryClient,
          loggedInUsername,
        );
        res.send(trainingSessionsAPI);
      }
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
    
  });

  app.get('/trainingSessions/:username', async (req, res) => {
    try {
      // let loggedInUsername = 'a_administrator'; // username will be set to the username from session variable when log in feature is implemented
      // let loggedInUsername = CURRENTLY_LOGGED_IN;
      // let username = req.params.us
      //right now, just let the username = 'a_administrator' so that it has the right to see the teams list of all players.
      const queriedUsername = req.params.username;
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      let trainingSessionsAPI = await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to see the training sessions of player
          // currently, the coach can see the training sessions of all players and coach for testing purpose 
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername!, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerTrainingSessionsAPI(sqlDB, queryClient, req.params.username);
          } else {
            // throw new Error('Cannot find the input username in your teams');
            throwBasedOnCode('e400.9', queriedUsername);
          }
        },
        async () => {
          return getTrainingSessionsAPI(sqlDB, queryClient, req.params.username);
        },
      ) as any[];
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
