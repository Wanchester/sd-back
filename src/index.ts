import { ClientOptions, InfluxDB, Point, QueryApi } from '@influxdata/influxdb-client';
import express from 'express';
import { resolve } from 'path';
import moment from 'moment';
import session from 'express-session';
import { readFileSync } from 'fs';
import interpole from 'string-interpolation-js'; 
import bodyParser from 'body-parser';
import { devNull } from 'os';

export interface SessionResponseType {
  'playerName': string,
  'sessionName': string,
  'sessionDate': string,
  'sessionTime': string,
  'teamName': string,
}

export interface HomepageResponseType {
  'name': string,
  'email': string,
  'dob': string,
  'nationality': string,
  'height': number,
  'weight': number,
  'type': string,
  'teams':string[],
  'trainingSessions': SessionResponseType[],
}
const app = express();
//to read the body of the request from backend
app.use(bodyParser.json()); 
const port = process.env.SD_SERVER_PORT || 3000;
const DEFAULT_PLAYER = 'Warren';
//SQL
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('test.db');
//Influx
const DBtoken = process.env.SD_SERVER_INFLUX_API_KEY || 'SKCqeTd4N-0fYfMPo37Ro8Pv_d-PQX4SoEpfYMTyCdV2Ucjif9RNy-5obta8cQRqKlpB25YvOKkT4tdqxw__Gg==';  
const url = 'https://ap-southeast-2-1.aws.cloud2.influxdata.com';
const client = new InfluxDB({ url: url, token: DBtoken });
let org = 'qethanmoore@gmail.com';
let queryClient = client.getQueryApi(org);

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

//function to retrive information from SQL
const SQLretrieve = async (query: string, paraLst: any[]) => {
  let data : any[] = []; 
  //console.log(query);
  await new Promise<void>((resolve) => {
    db.serialize(function () {
      db.each(query, paraLst , function (err: any, row:any) {
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

const SQLretrieveNoArg = async (query: string) => {
  let data : any[] = []; 
  //console.log(query);
  await new Promise<void>((resolve) => {
    db.serialize(function () {
      db.each(query, function (err: any, row:any) {
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

const query = 'select * from Users where username = ?';
const preparedQuery = db.prepare('select * from Users where username = ?');

const SQLretrievePrepare = async (query: any, params: any[] = []) => {
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

let wrapperFunction = async () => {
  let receiver = await SQLretrievePrepare('select * from Users where username = ?', ['warren']);
  //console.log(receiver);

  console.log('\n');
  receiver = await SQLretrievePrepare('select * from Users');
  //console.log(receiver);
};

wrapperFunction();

//function to retrive information from SQL
// const SQLretrieve2 = async (query: string) => {
//   let data : any[] = []; 
//   await new Promise<void>((resolve) => {
//     db.serialize(function () {
//       db.each( 'select * from users where username = ?', ['warren'], function (err: any, row:any) {
//         data.push(row); //pushing rows into array
//         //console.log(row)
//       }, 
//       function () { // calling function when all rows have been pulled
//         db.close(); //closing connection
//         resolve();
//       });
//     });
//   });
//   return data;
// };




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

async function getTrainingSessionsAPI(username: string) {
  //get the information of all the training sessions of given players
  let PLAYER = username;
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

async function getJoinedTeamsAPI(username: string) {
  let PLAYER = username;
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

async function getPersonalInfoAPI(username: string) {
  let PLAYER = username;
  //console.log(PLAYER);
  //search the player in the SQL
  let query = 'select * from users where username = ?';
  let paramLst = [PLAYER];
  let playerInfo = await SQLretrieve(query, paramLst);
 
  //console.log(playerInfo);

  let query2 = 'select * from users';
  let paramLst2: any[] = [PLAYER];
  let playerInfo2 = await SQLretrieveNoArg(query2);
  //console.log(playerInfo2);

  let query3 = 'select * from users';
  let paramLst3: any[] = [PLAYER];
  let playerInfo3 = await SQLretrieve(query3, paramLst3);
  //console.log(playerInfo3);

  //get the teams that the given player joined in
  /*
  let queryPlayersTeams = readFileSync(resolve(__dirname, '../../queries/players_teams.flux'), { encoding: 'utf8' });
  queryPlayersTeams = interpole(queryPlayersTeams, [PLAYER]);   
  const teams =  await executeInflux(queryPlayersTeams, queryClient);
  const cleanedTeams:string[] = [];
  for (let i = 0; i < teams.length; i++ ) {
    cleanedTeams.push(teams[i]._measurement);
  }
  return cleanedTeams;
  */
}

getPersonalInfoAPI('warren');

async function getHomepageAPI(username: string) {
  let PLAYER = username;

  //get the information of all the training sessions of given players
  const cleanedTrainingSessions = await getTrainingSessionsAPI(PLAYER);
  //get the teams that given players has joined in
  const cleanedTeams = await getJoinedTeamsAPI(PLAYER);

  //define the structure of the API that will be returned to frontend
  const homepageInfo = {
    'name': '',
    'email': '',
    'dob': '',
    'nationality':'',
    'height':0,
    'weight':0,
    'type:':'',
    'teams':['', '' ],
    'trainingSessions':[{}, {}],
  };
  homepageInfo.name = PLAYER;
  homepageInfo.teams = cleanedTeams;
  homepageInfo.trainingSessions = cleanedTrainingSessions;

  return homepageInfo;
}

//API endpoints
app.get('/profile', async (req, res) => {
  /* 
  username should be set to the username in the session variable if it is not provided. 
  Currently, the default users that will be returned is Warren
  */
  let username  = 'Warren' ;
  let homepageAPI = await getHomepageAPI(username);
  res.send(homepageAPI);
});

app.get('/profile/:username', async (req, res) => {
  let username  = req.params.username;
  let homepageAPI = await getHomepageAPI(username);
  res.send(homepageAPI);
});
//
app.get('/sessions', async (req, res) => {
  let username  = DEFAULT_PLAYER;
  let trainningSessionsAPI = await getTrainingSessionsAPI(username);
  res.send(trainningSessionsAPI);
});

app.get('/sessions/:username', async (req, res) => {
  let username  = req.params.username;
  let trainningSessionsAPI = await getTrainingSessionsAPI(username);
  res.send(trainningSessionsAPI);
});

app.get('/joinedTeams', async (req, res) => {
  let username  = DEFAULT_PLAYER;
  let joinedTeamsAPI = await getJoinedTeamsAPI(username);
  res.send(joinedTeamsAPI);
});

app.get('/joinedTeams/:username', async (req, res) => {
  let username  = req.params.username;
  let joinedTeamsAPI = await getJoinedTeamsAPI(username);
  res.send(joinedTeamsAPI);
});

app.put('/profile/:username', async (req, res) => {
  let email  = req.body;
  console.log(email);
  res.send(email);
});


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});















let nameList = [
  "5C3EBE",
  "6C3EBE",
  "Ballard",
  "Boucher",
  "Exon",
  "F4E2BC",
  "Flynn",
  "JD",
  "Jbk",
  "Kemp",
  "Maibaum",
  "NO PLAYER",
  "Nelson",
  "Nolan",
  "Pods",
  "Rigga",
  "Sibba",
  "Silv",
  "T Mac",
  "Warren"
];

let coachList =[
    "Coach"
]

let teamList = [ 
  "Teambit"
];

function nameToID(s: any) {
  return ([...(s.toLowerCase())]              //lowercase
      .filter((c) => c !== " " && c !== "\t") //filter all whitespace
      .join("")
    )
}

/*
  async function executeSQL(SQLquery: string) {
    let testReturn: any = [];

    db.each(SQLquery, (err: any, row: any) => {
      //console.log(row);
      testReturn.push(row);
    }, 
     () =>  {
      console.log('\nQuery SQL Successfully');
    }
    );
  
    return testReturn; 
  }



*/




// let wrapperFunction = async () => {
//   //console.log('receiver: ');
//   let receiver = await SQLretrieve();
//   //console.log(receiver);
// };

// wrapperFunction();

//db.close();
























// db.serialize(function() {
//   db.each("SELECT * FROM uid_" + member.id + " WHERE id = " + member.id , function(err, row) {
//     data.push(row); //pushing rows into array
//   }, function(){ // calling function when all rows have been pulled
//     db.close(); //closing connection
//     callback(data); 
//   });
// });
