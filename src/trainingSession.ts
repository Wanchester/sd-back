import { QueryApi } from '@influxdata/influxdb-client';
import { readFileSync } from 'fs';
import moment from 'moment';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import { getPersonalInfoAPI, executeInflux, DEFAULT_USERNAME, callBasedOnRole } from './utils';
import { resolve as pathResolve } from 'path';
import { SessionResponseType } from './interface';
import { Express } from 'express';
import TimeFormat from 'hh-mm-ss';
import { getCoachTeamsAPI } from './team';

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
  console.log(trainingSessions);
  const cleanedTrainingSessions: any[] = [];
  for (let i = 0; i < trainingSessions.length; i++) {
    const aSession = {
      playerName: '',
      sessionName: '',
      sessionDate: '',
      sessionTime: '',
      teamName: '',
      duration: '',
    } as SessionResponseType;
    aSession.playerName = trainingSessions[i]['Player Name'];
    aSession.sessionName = trainingSessions[i].Session.split(' ')[0];
    aSession.sessionDate = moment(trainingSessions[i]._time).format('DD-MM-YYYY');     //DateOfMonth-Month-Year. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
    aSession.sessionTime = moment(trainingSessions[i]._time).format('HH:mm');          //24HoursFormat:minutes. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
    aSession.teamName = trainingSessions[i]._measurement;
    aSession.duration = TimeFormat.fromS(trainingSessions[i].elapsed, 'hh:mm:ss');     //hour:minutes:seconds.See https://github.com/Goldob/hh-mm-ss#supported-time-formats
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
      aSession.duration = TimeFormat.fromS(trainingSessions[i].elapsed, 'hh:mm:ss');     //hour:minutes:seconds.See https://github.com/Goldob/hh-mm-ss#supported-time-formats
      cleanedTrainingSessions.push(aSession);
    }
    return cleanedTrainingSessions;
  } else {
    throw new Error('cannot find player with given username');
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
    throw new Error('cannot find coach with given username');
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

//actually this one is getPlayerTrainingSessionsAPI
// export async function getTrainingSessionsAPI(
//   db: Database,
//   queryClient: QueryApi,
//   username: string,
// ) {
//   //search the personal information of given username from SQL database
//   const personalInfo = await getPersonalInfoAPI(db, username);
//   if ('error' in personalInfo) {
//     return personalInfo;
//   }
//   let PLAYER = personalInfo.name;
//   //get the information of all the training sessions of given players
//   let queryPlayerSession = readFileSync(
//     pathResolve(__dirname, '../../queries/players_sessions.flux'),
//     { encoding: 'utf8' },
//   );
//   queryPlayerSession = interpole(queryPlayerSession, [PLAYER]);
//   const trainingSessions = await executeInflux(queryPlayerSession, queryClient);
//   const cleanedTrainingSessions: any[] = [];
//   for (let i = 0; i < trainingSessions.length; i++) {
//     const aSession = {
//       playerName: '',
//       sessionName: '',
//       sessionDate: '',
//       sessionTime: '',
//       teamName: '',
//       duration: '',
//     } as SessionResponseType;
//     aSession.playerName = trainingSessions[i]['Player Name'];
//     aSession.sessionName = trainingSessions[i].Session.split(' ')[0];
//     aSession.sessionDate = moment(trainingSessions[i]._time).format('DD-MM-YYYY');     //DateOfMonth-Month-Year. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
//     aSession.sessionTime = moment(trainingSessions[i]._time).format('HH:mm');          //24HoursFormat:minutes. See https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/ 
//     aSession.teamName = trainingSessions[i]._measurement;
//     aSession.duration = TimeFormat.fromS(trainingSessions[i].elapsed, 'hh:mm:ss');     //hour:minutes:seconds.See https://github.com/Goldob/hh-mm-ss#supported-time-formats
//     cleanedTrainingSessions.push(aSession);
//   }
//   return cleanedTrainingSessions;
// }

export default function bindGetTrainingSessions(
  app: Express,
  db: Database,
  queryClient: QueryApi,
) {
  app.get('/trainingSessions', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = sess.username;
      let username = DEFAULT_USERNAME;

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
      let username = 'a_administrator'; // username will be set to the username from session variable when log in feature is implemented
      // let username = req.params.us
      //right now, just let the username = 'a_administrator' so that it has the right to see the teams list of all players.
       
      let trainingSessionsAPI = (await callBasedOnRole(
        db,
        username!,
        async () => {
          throw new Error('You are not allowed to make the request');
        },
        async () => {
          // the coach should only be able to see the training sessions of player
          // currently, the coach can see the training sessions of all players and coach for testing purpose 
          return getPlayerTrainingSessionsAPI(db, queryClient, req.params.username);
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
