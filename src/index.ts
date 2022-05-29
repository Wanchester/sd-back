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
import bindGetTeams, { getTeamsAPI } from './team';
import bindGetTrainingSessions, { getTrainingSessionsAPI } from './trainingSession';
import bindGetProfile, { getProfileAPI } from './profile';


const app = express();
const port = process.env.SD_SERVER_PORT || 3000;
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

// bind the API endpoints
// GET requests
bindGetTeams(app, db, queryClient);
bindGetTrainingSessions(app, db, queryClient);
bindGetProfile(app, db, queryClient);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});






