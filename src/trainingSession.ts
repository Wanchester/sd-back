import { QueryApi } from '@influxdata/influxdb-client';
import { readFileSync } from 'fs';
import moment from 'moment';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import { getPersonalInfoAPI, executeInflux, callBasedOnRole, getCommonTeams, CURRENTLY_LOGGED_IN } from './utils';
import { resolve as pathResolve } from 'path';
import { SessionResponseType } from './interface';
import { Express } from 'express';
import { getCoachTeamsAPI } from './team';
import { getDuration } from './utilsInflux';
import throwBasedOnCode from './throws';

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
      sessionName: '',
      sessionDate: '',
      sessionTime: '',
      teamName: '',
      duration: '',
    } as SessionResponseType;
    aSession.sessionName = trainingSessions[i].Session.split(' ')[0];
    aSession.sessionDate = moment(trainingSessions[i]._time).format('DD-MM-YYYY');     //DateOfMonth-Month-Year. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
    aSession.sessionTime = moment(trainingSessions[i]._time).format('HH:mm');          //24HoursFormat:minutes. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
    aSession.teamName = trainingSessions[i]._measurement;
    // aSession.duration = TimeFormat.fromS(trainingSessions[i].elapsed, 'hh:mm:ss');     //hour:minutes:seconds.See https://github.com/Goldob/hh-mm-ss#supported-time-formats
    aSession.duration = getDuration(trainingSessions[i]._start, trainingSessions[i]._stop);
    cleanedTrainingSessions.push(aSession);
  }
  return cleanedTrainingSessions;
}

export async function getPlayerTrainingSessionsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  if (personalInfo.role == 'player') {
    //get the information of all the training sessions of given players
    let queryPlayerSession = readFileSync(
      pathResolve(__dirname, '../../queries/players_sessions.flux'),
      { encoding: 'utf8' },
    );

    queryPlayerSession = interpole(queryPlayerSession, [personalInfo.name]);
    // queryPlayerSession = 'test exception';
    const trainingSessions = await executeInflux(queryPlayerSession, queryClient);
    const cleanedTrainingSessions: any[] = [];
    for (let i = 0; i < trainingSessions.length; i++) {
      const aSession = {
        sessionName: '',
        sessionDate: '',
        sessionTime: '',
        teamName: '',
        duration: '',
      } as SessionResponseType;
      aSession.sessionName = trainingSessions[i].Session.split(' ')[0];
      aSession.sessionDate = moment(trainingSessions[i]._time).format('DD-MM-YYYY');     //DateOfMonth-Month-Year. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
      aSession.sessionTime = moment(trainingSessions[i]._time).format('HH:mm');          //24HoursFormat:minutes. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
      aSession.teamName = trainingSessions[i]._measurement;
      // aSession.duration = TimeFormat.fromS(trainingSessions[i].elapsed, 'hh:mm:ss');     //hour:minutes:seconds.See https://github.com/Goldob/hh-mm-ss#supported-time-formats
      aSession.duration = getDuration(trainingSessions[i]._start, trainingSessions[i]._stop);
      cleanedTrainingSessions.push(aSession);
    }
    return cleanedTrainingSessions;
  } else {
    // 'e404.0': 'Cannot find a player with given username :0',
    throwBasedOnCode('e404.0', username);
  }
}

export async function getCoachTrainingSessionsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  if (personalInfo.role == 'coach') {
    // get all the teams of given coach's username
    let teams = await getCoachTeamsAPI(db, queryClient, username);
    let teamsTrainingSessions: any[] = []; 
    // for each of team in teams, get all training sessions of that team
    for (let i = 0; i < teams.length;  i++) {
      let trainingSessions = await getTeamTrainingSessionsAPI(queryClient, teams[i]);
      teamsTrainingSessions.push(...trainingSessions);
    }
    return teamsTrainingSessions;
  } else {
    // 'e404.1': 'Cannot find a coach with given username',
    throwBasedOnCode('e404.1', username);
  }
}

export async function getTrainingSessionsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  if (personalInfo.role == 'player') {
    let trainingSessions = await getPlayerTrainingSessionsAPI(db, queryClient, username);
    return trainingSessions;
  } else if (personalInfo.role == 'coach') {
    let trainingSessions = await getCoachTrainingSessionsAPI(db, queryClient, username);
    return trainingSessions;
  }
}

export default function bindGetTrainingSessions(
  app: Express,
  db: Database,
  queryClient: QueryApi,
) {
  app.get('/trainingSessions', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = sess.username;
      let username = CURRENTLY_LOGGED_IN;

      let trainingSessionsAPI = await getTrainingSessionsAPI(
        db,
        queryClient,
        username,
      );
      res.send(trainingSessionsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });

  app.get('/trainingSessions/:username', async (req, res) => {
    try {
      // let loggedInUsername = 'a_administrator'; // username will be set to the username from session variable when log in feature is implemented
      let loggedInUsername = CURRENTLY_LOGGED_IN;
      // let username = req.params.us
      //right now, just let the username = 'a_administrator' so that it has the right to see the teams list of all players.
       
      let trainingSessionsAPI = (await callBasedOnRole(
        db,
        loggedInUsername!,
        async () => {
          // 'e401.1': 'You have to be a coach/admin to make this request.',
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to see the training sessions of players in his teams
          let commonTeams = await getCommonTeams( db, queryClient, loggedInUsername, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerTrainingSessionsAPI(db, queryClient, req.params.username);
          } else {
            // 'e404.4': 'Cannot find the input username :0 in your teams,
            throwBasedOnCode('e404.4', req.params.username);
          }
        },
        async () => {
          return getTrainingSessionsAPI(db, queryClient, req.params.username);
        },
      )) as any[];
      res.send(trainingSessionsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}
