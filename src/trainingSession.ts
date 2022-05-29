import { QueryApi } from '@influxdata/influxdb-client';
import { readFileSync } from 'fs';
import moment from 'moment';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import { getPersonalInfoAPI, executeInflux } from './utils';
import { resolve as pathResolve } from 'path';
import { SessionResponseType } from './interface';
import { Express } from 'express';
//var TimeFormat = require('hh-mm-ss');
import TimeFormat from 'hh-mm-ss';

const DEFAULT_USERNAME = 'warren';

export async function getTrainingSessionsAPI(db: Database, queryClient: QueryApi, username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let PLAYER = personalInfo[0].name;
  //get the information of all the training sessions of given players
  let queryPlayerSession  = readFileSync(pathResolve(__dirname, '../../queries/players_sessions.flux'), { encoding: 'utf8' });
  queryPlayerSession = interpole(queryPlayerSession, [PLAYER]);
  const trainingSessions = await executeInflux(queryPlayerSession, queryClient);
  const cleanedTrainingSessions:any[] = [];
  for (let i = 0; i < trainingSessions.length; i++ ) {
    const aSession = {
      'playerName': '',
      'sessionName': '',
      'sessionDate': '',
      'sessionTime': '',
      'teamName': '',
      'duration':'',
    } as SessionResponseType;
    aSession.playerName = trainingSessions[i]['Player Name'];
    aSession.sessionName = trainingSessions[i].Session.split(' ')[0];
    aSession.sessionDate = moment(trainingSessions[i]._time).format('DD-MM-YYYY');
    aSession.sessionTime = moment(trainingSessions[i]._time).format('HH:MM');
    aSession.teamName = trainingSessions[i]._measurement;
    aSession.duration =  TimeFormat.fromS(trainingSessions[i].elapsed);
    cleanedTrainingSessions.push(aSession);
  }  
  return cleanedTrainingSessions;
}

export default function bindGetTrainingSessions(app: Express, db: Database, queryClient: QueryApi) {
  app.get('/trainingSessions', async (req, res) => {
    try {
      let username  = DEFAULT_USERNAME;
      let trainingSessionsAPI = await getTrainingSessionsAPI(db, queryClient, username);
      res.send(trainingSessionsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  });

  app.get('/trainingSessions/:username', async (req, res) => {
    try {
      let username  = req.params.username;
      let trainingSessionsAPI = await getTrainingSessionsAPI(db, queryClient, username);
      res.send(trainingSessionsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
      });
    }
  });
}