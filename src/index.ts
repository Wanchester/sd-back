import { InfluxDB, QueryApi } from '@influxdata/influxdb-client';
import express from 'express';
import { resolve as pathResolve } from 'path';
import moment from 'moment';
import session from 'express-session';
import { readFileSync } from 'fs';
import interpole from 'string-interpolation-js'; 
import bodyParser from 'body-parser';
import console from 'console';
import _ from 'lodash';
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

import { SQLretrieve, executeInflux, callBasedOnRole, getPersonalInfoAPI } from './utils';
import { getJoinedTeamAPI } from './team';
import { getTrainingSessionAPI } from './trainingSession';
import { getProfileAPI } from './profile';

export interface SessionResponseType {
  'playerName': string,
  'sessionName': string,
  'sessionDate': string,
  'sessionTime': string,
  'teamName': string,
}

export interface HomepageResponseType {
  'username': string,
  'name': string,
  'email': string,
  'dob': string,
  'nationality': string,
  'height': number,
  'weight': number,
  'role': string,
  'teams':string[],
  'trainingSessions': SessionResponseType[],
}

const app = express();
const port = process.env.SD_SERVER_PORT || 3000;
const DEFAULT_USERNAME = 'warren';
//SQL
const db = new sqlite3.Database('test.db');
//Influx
const DBtoken = process.env.SD_SERVER_INFLUX_API_KEY || 'SKCqeTd4N-0fYfMPo37Ro8Pv_d-PQX4SoEpfYMTyCdV2Ucjif9RNy-5obta8cQRqKlpB25YvOKkT4tdqxw__Gg==';  
const url = 'https://ap-southeast-2-1.aws.cloud2.influxdata.com';
const client = new InfluxDB({ url: url, token: DBtoken });
const org = 'qethanmoore@gmail.com';
const queryClient = client.getQueryApi(org);

app.use(bodyParser.json());  //to read the body of the request from backend
app.use(
  session({
    secret: 'this is a key',
    resave:false,
    saveUninitialized: false,
  }),
);
declare module 'express-session' {
  interface SessionData {
    username: string;
  }
}

// async function getProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string) {
//   //search the personal information of given username from SQL database
//   const personalInfo = await getPersonalInfoAPI(db, username);
//   if ('error' in personalInfo[0]) {
//     return personalInfo;
//   }
//   let playerName = personalInfo[0].name;
//   //get the teams that given players has joined in
//   const teams = await getJoinedTeamAPI(sqlDB, queryClient, username);
//   //get the information of all the training sessions of given players
//   const trainingSession = await getTrainingSessionAPI(sqlDB, queryClient, username);
//   //define the structure of the API that will be returned to frontend
//   const homepageInfo = {
//     'username':'',
//     'name': '',
//     'email': '',
//     'dob': '',
//     'nationality':'',
//     'height':0,
//     'weight':0,
//     'role':'',
//     'team':[''],
//     'trainingSession':[{}],
//   };
//   homepageInfo.username = username;
//   homepageInfo.name = playerName;
//   homepageInfo.email = personalInfo[0].email;
//   homepageInfo.dob = personalInfo[0].dob;
//   homepageInfo.nationality = personalInfo[0].nationality;
//   homepageInfo.height = personalInfo[0].height;
//   homepageInfo.weight = personalInfo[0].weight;
//   homepageInfo.role = personalInfo[0].role;
//   homepageInfo.team = teams;

//   await callBasedOnRole(db, username, () => {
//     homepageInfo.trainingSession = trainingSession;
//   });
//   return homepageInfo;
// }

// API endpoints
// GET requests
app.get('/team', async (req, res) => {
  let username  = DEFAULT_USERNAME;
  let joinedTeamAPI = await getJoinedTeamAPI(db, queryClient, username);
  res.send(joinedTeamAPI);
});

app.get('/team/:username', async (req, res) => {
  let username  = req.params.username;
  let joinedTeamAPI = await getJoinedTeamAPI(db, queryClient, username);
  res.send(joinedTeamAPI);
});

app.get('/session', async (req, res) => {
  let username  = DEFAULT_USERNAME;
  let trainningSessionAPI = await getTrainingSessionAPI(db, queryClient, username);
  res.send(trainningSessionAPI);
});

app.get('/session/:username', async (req, res) => {
  let username  = req.params.username;
  let trainningSessionAPI = await getTrainingSessionAPI(db, queryClient, username);
  res.send(trainningSessionAPI);
});

app.get('/profile', async (req, res) => {
  /* 
  username should be set to the username in the session variable if it is not provided. 
  Currently, the default users that will be returned is Warren
  */
  let username  = DEFAULT_USERNAME;
  let homepageAPI = await getProfileAPI(db, queryClient ,username);
  res.send(homepageAPI);
});

app.get('/profile/:username', async (req, res) => {
  let username  = req.params.username;
  let homepageAPI = await getProfileAPI(db, queryClient ,username);
  res.send(homepageAPI);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});






