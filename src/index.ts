import { ClientOptions, InfluxDB, Point, QueryApi } from '@influxdata/influxdb-client';
import { devNull } from 'os';
import express from 'express';
import { resolve } from 'path';
import moment from 'moment';
import session from 'express-session';
import { readFileSync } from 'fs';
import interpole from 'string-interpolation-js'; 
import bodyParser from 'body-parser';
import console from 'console';

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
const sqlite3 = require('sqlite3').verbose();
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

//function to retrieve information from SQL database
const SQLretrieve = async (query: any, params: any[] = []) => {
  let data : any[] = []; 
  await new Promise<void>((resolve) => {
    db.serialize(function () {
      let statement = db.prepare(query);
      statement.each(params, function (err: any, row:any) {
        data.push(row); //pushing rows into array
        //console.log(row)
      }, 
      function () { // calling function when all rows have been pulled
        //db.close(); //closing connection
        resolve();
      });
    });
  });
  //console.log(data);
  return data;
};

//function to run the InfluxDB querry
const executeInflux = async (fluxQuery: string, influxClient: QueryApi ) => {
  let sessionArray : any[] = []; 

  await new Promise<void>((resolve, reject) => {
    let rejected = false;
    influxClient.queryRows(fluxQuery, {
      next: (row, tableMeta) => {
        const tableObject = tableMeta.toObject(row);
        sessionArray.push(tableObject);
      },
      error: (my_error) => {
        rejected = true;
        reject(my_error);
      },
      complete: () => {
        console.log('\nQuery Successfully');
        if (!rejected) {
          resolve();
        }
      },
    });
  });
  return sessionArray;
};

async function getPersonalInfoAPI(username: string) {
  const query = 'select * from Users where username = ?';
  //search the player in the SQL
  let paramsLst = [username];
  let playerInfo = await SQLretrieve(query, paramsLst);

  if (playerInfo.length == 0) {
    return [{
      'error': 'given username is not found',
    }];
  }
  return playerInfo;
}

async function getJoinedTeamsAPI(username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let PLAYER = personalInfo[0].Name;
  //get the teams that the given player joined in
  let queryPlayersTeams = readFileSync(resolve(__dirname, '../../queries/players_teams.flux'), { encoding: 'utf8' });
  queryPlayersTeams = interpole(queryPlayersTeams, [PLAYER]);   
  const teams =  await executeInflux(queryPlayersTeams, queryClient);
  const cleanedTeams:string[] = [];

  for (let i = 0; i < teams.length; i++ ) {
    cleanedTeams.push(teams[i]._measurement);
  }
  return cleanedTeams;
}

async function getTrainingSessionsAPI(username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let PLAYER = personalInfo[0].Name;
  //get the information of all the training sessions of given players
  let queryPlayersSessions  = readFileSync(resolve(__dirname, '../../queries/players_sessions.flux'), { encoding: 'utf8' });
  queryPlayersSessions = interpole(queryPlayersSessions, [PLAYER]);
  
  const trainingSessions = await executeInflux(queryPlayersSessions, queryClient);
  const cleanedTrainingSessions:any[] = [];
  for (let i = 0; i < trainingSessions.length; i++ ) {
    const aSession = {
      'playerName': '',
      'sessionName': '',
      'sessionDate': '',
      'sessionTime': '',
      'teamName': '',
    } as SessionResponseType;
    aSession.playerName = trainingSessions[i]['Player Name'];
    aSession.sessionName = trainingSessions[i].Session.split(' ')[0];
    aSession.sessionDate = moment(trainingSessions[i]._time).format('DD-MMM-YYYY');
    aSession.sessionTime = moment(trainingSessions[i]._time).format('HH:MM');
    aSession.teamName = trainingSessions[i]._measurement;
    cleanedTrainingSessions.push(aSession);
  }  
  return cleanedTrainingSessions;
}

async function getHomepageAPI(username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let playerName = personalInfo[0].Name;
  //get the teams that given players has joined in
  const teams = await getJoinedTeamsAPI(username);
  //get the information of all the training sessions of given players
  const trainingSessions = await getTrainingSessionsAPI(username);
 
  //define the structure of the API that will be returned to frontend
  const homepageInfo = {
    'username':'',
    'name': '',
    'email': '',
    'dob': '',
    'nationality':'',
    'height':0,
    'weight':0,
    'role':'',
    'teams':['', '' ],
    'trainingSessions':[{}, {}],
  };
  homepageInfo.username = username;
  homepageInfo.name = playerName;
  homepageInfo.dob = personalInfo[0].DOB;
  homepageInfo.role = personalInfo[0].Role;
  homepageInfo.teams = teams;
  if (personalInfo[0].Role == 'Player') {
    homepageInfo.trainingSessions = trainingSessions;
  }
  return homepageInfo;
}

// API endpoints
// GET requests
app.get('/joinedTeams', async (req, res) => {
  let username  = DEFAULT_USERNAME;
  let joinedTeamsAPI = await getJoinedTeamsAPI(username);
  res.send(joinedTeamsAPI);
});

app.get('/joinedTeams/:username', async (req, res) => {
  let username  = req.params.username;
  let joinedTeamsAPI = await getJoinedTeamsAPI(username);
  res.send(joinedTeamsAPI);
});

app.get('/sessions', async (req, res) => {
  let username  = DEFAULT_USERNAME;
  let trainningSessionsAPI = await getTrainingSessionsAPI(username);
  res.send(trainningSessionsAPI);
});

app.get('/sessions/:username', async (req, res) => {
  let username  = req.params.username;
  let trainningSessionsAPI = await getTrainingSessionsAPI(username);
  res.send(trainningSessionsAPI);
});

app.get('/profile', async (req, res) => {
  /* 
  username should be set to the username in the session variable if it is not provided. 
  Currently, the default users that will be returned is Warren
  */
  let username  = DEFAULT_USERNAME;
  let homepageAPI = await getHomepageAPI(username);
  res.send(homepageAPI);
});

app.get('/profile/:username', async (req, res) => {
  let username  = req.params.username;
  let homepageAPI = await getHomepageAPI(username);
  res.send(homepageAPI);
});

// PUT requests
app.put('/profile/:username', async (req, res) => {
  let email  = req.body;
  console.log(email);
  res.send(email);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});