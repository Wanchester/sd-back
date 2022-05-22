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
      }, 
      function () { // calling function when all rows have been pulled
        //db.close(); //closing connection
        resolve();
      });
    });
  });
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
  //search the player in the SQL
  const query = 'select * from Users where username = ?';
  let paramsLst = [username];
  let playerInfo = await SQLretrieve(query, paramsLst);

  if (playerInfo.length == 0) {
    return [{
      'error': 'given username is not found',
    }];
  }
  return playerInfo;

}

async function getJoinedTeamAPI(username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let PLAYER = personalInfo[0].name;
  //get the teams that the given player joined in
  let queryPlayerTeam = readFileSync(resolve(__dirname, '../../queries/players_teams.flux'), { encoding: 'utf8' });
  queryPlayerTeam = interpole(queryPlayerTeam, [PLAYER]);   
  const teams =  await executeInflux(queryPlayerTeam, queryClient);
  const cleanedTeams:string[] = [];

  for (let i = 0; i < teams.length; i++ ) {
    cleanedTeams.push(teams[i]._measurement);
  }
  return cleanedTeams;
}

async function getTrainingSessionAPI(username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let PLAYER = personalInfo[0].name;
  //get the information of all the training sessions of given players
  let queryPlayerSession  = readFileSync(resolve(__dirname, '../../queries/players_sessions.flux'), { encoding: 'utf8' });
  queryPlayerSession = interpole(queryPlayerSession, [PLAYER]);
  
  const trainingSession = await executeInflux(queryPlayerSession, queryClient);
  const cleanedTrainingSession:any[] = [];
  for (let i = 0; i < trainingSession.length; i++ ) {
    const aSession = {
      'playerName': '',
      'sessionName': '',
      'sessionDate': '',
      'sessionTime': '',
      'teamName': '',
    } as SessionResponseType;
    aSession.playerName = trainingSession[i]['Player Name'];
    aSession.sessionName = trainingSession[i].Session.split(' ')[0];
    aSession.sessionDate = moment(trainingSession[i]._time).format('DD-MMM-YYYY');
    aSession.sessionTime = moment(trainingSession[i]._time).format('HH:MM');
    aSession.teamName = trainingSession[i]._measurement;
    cleanedTrainingSession.push(aSession);
  }  
  return cleanedTrainingSession;
}

async function getHomepageAPI(username: string) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(username);
  if ('error' in personalInfo[0]) {
    return personalInfo;
  }
  let playerName = personalInfo[0].name;
  //get the teams that given players has joined in
  const teams = await getJoinedTeamAPI(username);
  //get the information of all the training sessions of given players
  const trainingSession = await getTrainingSessionAPI(username);
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
  homepageInfo.email = personalInfo[0].email;
  homepageInfo.dob = personalInfo[0].dob;
  homepageInfo.nationality = personalInfo[0].nationality;
  homepageInfo.height = personalInfo[0].height;
  homepageInfo.weight = personalInfo[0].weight;
  homepageInfo.role = personalInfo[0].role;
  homepageInfo.teams = teams;
  if (personalInfo[0].role == 'Player') {
    homepageInfo.trainingSessions = trainingSession;
  }
  return homepageInfo;
}

// API endpoints
// GET requests
app.get('/joinedTeam', async (req, res) => {
  let username  = DEFAULT_USERNAME;
  let joinedTeamAPI = await getJoinedTeamAPI(username);
  res.send(joinedTeamAPI);
});

app.get('/joinedTeam/:username', async (req, res) => {
  let username  = req.params.username;
  let joinedTeamAPI = await getJoinedTeamAPI(username);
  res.send(joinedTeamAPI);
});

app.get('/session', async (req, res) => {
  let username  = DEFAULT_USERNAME;
  let trainningSessionAPI = await getTrainingSessionAPI(username);
  res.send(trainningSessionAPI);
});

app.get('/session/:username', async (req, res) => {
  let username  = req.params.username;
  let trainningSessionAPI = await getTrainingSessionAPI(username);
  res.send(trainningSessionAPI);
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
  let reqBody = req.body;
  let username  = req.params.username;
  const personalInfo = await getPersonalInfoAPI(username);
  if ('error' in personalInfo[0]) {
    res.send(personalInfo);
    return personalInfo;
  } else {
    if ('name' in reqBody) {
      const updateStatement = db.prepare('update users set name = ? where username = ?;');
      updateStatement.run(req.body.name, username);
    }
    if ('email' in reqBody) {
      const updateStatement = db.prepare('update users set email = ? where username = ?;');
      updateStatement.run(req.body.email, username);
    }
    if ('dob' in reqBody) {
      const updateStatement = db.prepare('update users set dob = ? where username = ?;');
      updateStatement.run(req.body.dob, username);
    }
    if ('nationality' in reqBody) {
      const updateStatement = db.prepare('update users set nationality = ? where username = ?;');
      updateStatement.run(req.body.nationality, username);
    }
    if ('height' in reqBody) {
      const updateStatement = db.prepare('update users set height = ? where username = ?;');
      updateStatement.run(req.body.height, username);
    }
    if ('weight' in reqBody) {
      const updateStatement = db.prepare('update users set weight = ? where username = ?;');
      updateStatement.run(req.body.weight, username);
    }
    res.send(reqBody);
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});




