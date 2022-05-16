import { ClientOptions, InfluxDB, Point, QueryApi } from "@influxdata/influxdb-client";
import express from 'express';
import { resolve } from "path";
import moment from "moment";
import session from "express-session";
import { readFileSync } from "fs";
import interpole from "string-interpolation-js";

export interface SessionResponseType {
  'playerName': string,
  'sessionName': string,
  'sessionDate': string,
  'sessionTime': string,
  'teamName': string,
}

export interface HomepageResponseType {
  "name": string,
  "email": string,
  "dob": string,
  'nationality': string,
  'height': number,
  'weight': number,
  'teams':string[],
  'trainingSessions': SessionResponseType[],
}

const app = express();
const port = process.env.SD_SERVER_PORT || 3000;
const DBtoken = process.env.SD_SERVER_INFLUX_API_KEY || 'SKCqeTd4N-0fYfMPo37Ro8Pv_d-PQX4SoEpfYMTyCdV2Ucjif9RNy-5obta8cQRqKlpB25YvOKkT4tdqxw__Gg==';  
const url ='https://ap-southeast-2-1.aws.cloud2.influxdata.com';
const client = new InfluxDB({ url: url, token: DBtoken });
const DEFAULT_PLAYER = 'Warren'


let org = 'qethanmoore@gmail.com';
let bucket = 'test';
let queryClient = client.getQueryApi(org);

app.use(
  session({
    secret: 'this is a key',
    resave:false,
    saveUninitialized: false
  })
)

declare module 'express-session' {
  interface SessionData {
    username: string;
  }
}

/*
app.get('/profile', async (req, res) => {
  const playerUsername = 'Warren';
  //if the username is not provided, then username is Warren

  let PLAYER = playerUsername;

  let queryPlayersSessions  = readFileSync(resolve(__dirname, '../../queries/players_sessions.flux'), { encoding: 'utf8' });
  queryPlayersSessions = interpole(queryPlayersSessions, [PLAYER]);

  let queryPlayersTeams = readFileSync(resolve(__dirname, '../../queries/players_teams.flux'), { encoding: 'utf8' });
  queryPlayersTeams = interpole(queryPlayersTeams, [PLAYER]);

  //get the information of all the training sessions of given players
  const trainingSessions = await executeInflux(queryPlayersSessions, queryClient);
  const cleanedTrainingSessions:any[] = [];
  for (let i = 0; i<trainingSessions.length; i++ )
  {
    const session = {
      "playerName": "",
      "sessionName": null,
      "sessionDate": "",
      "sessionTime": "",
      "teamName": "",
    }
    session["playerName"] = trainingSessions[i]["Player Name"]
    session["sessionName"] = trainingSessions[i]["Session"].split(" ")[0]
    session["sessionDate"] = moment(trainingSessions[i]["_time"]).format("DD-MMM-YYYY")
    session["sessionTime"] = moment(trainingSessions[i]["_time"]).format("HH:MM")
    session["teamName"] = trainingSessions[i]["_measurement"]
    cleanedTrainingSessions.push(session)
  }

  //get the teams that the given player joined in
  const teams =  await executeInflux(queryPlayersTeams, queryClient);
  const cleanedTeams:string[] = []
  for(let i = 0; i < teams.length; i++ )
  {
    cleanedTeams.push(teams[i]["_measurement"])
  }

  //define the structure of the API that will be returned to frontend
  const homepageInfo = {
    "name": "",
    "email": "",
    "dob": '',
    'nationality':'',
    'height':0,
    'weight':0,
    'teams':['', '' ],
    'trainingSessions':[{}, {}] ,
  }
  homepageInfo['name'] = PLAYER 
  homepageInfo['teams'] = cleanedTeams
  homepageInfo['trainingSessions'] = cleanedTrainingSessions

  res.send(homepageInfo);
});


app.get('/profile/:username', async (req, res) => {
  
  const playerUsername = req.params.username;
  //if the username is not provided, then username is Warren

  let PLAYER = playerUsername;
  console.log(PLAYER);

  let queryPlayersSessions  = `from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["Player Name"] == "${PLAYER}")
    |>group(columns: ["Session"], mode: "by")
    |>limit(n: 1)`;

  let queryPlayersTeams = `from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["Player Name"] == "${PLAYER}")
    |>group(columns: ["_measurement"], mode:"by")
    |>limit(n: 1)`;

  //get the information of all the training sessions of given players
  const trainingSessions = await executeInflux(queryPlayersSessions, queryClient);
  const cleanedTrainingSessions:any[] = []
  for(let i = 0; i<trainingSessions.length; i++ )
  {
    const session = {
      "playerName": "",
      "sessionName": "",
      "sessionDate": "",
      "sessionTime": "",
      "teamName": "",
    } as SessionResponseType;
    session["playerName"] = trainingSessions[i]["Player Name"]
    session["sessionName"] = trainingSessions[i]["Session"].split(" ")[0]
    session["sessionDate"] = moment(trainingSessions[i]["_time"]).format("DD-MMM-YYYY")
    session["sessionTime"] = moment(trainingSessions[i]["_time"]).format("HH:MM")
    session["teamName"] = trainingSessions[i]["_measurement"]
    cleanedTrainingSessions.push(session)
  }

  //get the teams that the givne player joined in
  const teams =  await executeInflux(queryPlayersTeams, queryClient);
  const cleanedTeams:string[] = []
  for(let i = 0; i < teams.length; i++ )
  {
    cleanedTeams.push(teams[i]["_measurement"])
  }

  //define the structure of the API that will be returned to fronend
  const homepageInfo = {
    "name": "",
    "email": "",
    "dob": '',
    'nationality':'',
    'height':0,
    'weight':0,
    'teams':['', '' ],
    'trainingSessions':[{}, {}] ,
  }
  homepageInfo['name'] = PLAYER 
  homepageInfo['teams'] = cleanedTeams
  homepageInfo['trainingSessions'] = cleanedTrainingSessions

  res.send(homepageInfo)
});
*/

app.get('/profile', async (req, res) => {
  // username should be set to the username in the session variable if it is not provided. 
  ///Currently, the default users that will be returned is Warren
  let username  = 'Warren' ;
  let homepageAPI = await getHomepageAPI(username);
  res.send(homepageAPI);
});

app.get('/profile/:username', async (req, res) => {
  let username  = req.params.username;
  let homepageAPI = await getHomepageAPI(username);
  res.send(homepageAPI);
});

app.get('/sessions/:username', async (req, res) => {
  let username  = req.params.username;
  let trainningSessionsAPI = await getTrainingSessionsAPI(username);
  res.send(trainningSessionsAPI);
});

app.get('/sessions', async (req, res) => {
  let username  = DEFAULT_PLAYER;
  let trainningSessionsAPI = await getTrainingSessionsAPI(username);
  res.send(trainningSessionsAPI);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});

async function getHomepageAPI(username: string) {
  let PLAYER = username;
  console.log("PLAYER: "+PLAYER);

  let queryPlayersSessions  = readFileSync(resolve(__dirname, '../../queries/players_sessions.flux'), { encoding: 'utf8' });
  queryPlayersSessions = interpole(queryPlayersSessions, [PLAYER]);
  
  let queryPlayersTeams = readFileSync(resolve(__dirname, '../../queries/players_teams.flux'), { encoding: 'utf8' });
  queryPlayersTeams = interpole(queryPlayersTeams, [PLAYER]);   
   
  //get the information of all the training sessions of given players
  const trainingSessions = await executeInflux(queryPlayersSessions, queryClient);
  const cleanedTrainingSessions:any[] = []
  for(let i = 0; i<trainingSessions.length; i++ )
  {
    const session = {
      "playerName": "",
      "sessionName": "",
      "sessionDate": "",
      "sessionTime": "",
      "teamName": "",
    } as SessionResponseType;
    session["playerName"] = trainingSessions[i]["Player Name"]
    session["sessionName"] = trainingSessions[i]["Session"].split(" ")[0]
    session["sessionDate"] = moment(trainingSessions[i]["_time"]).format("DD-MMM-YYYY")
    session["sessionTime"] = moment(trainingSessions[i]["_time"]).format("HH:MM")
    session["teamName"] = trainingSessions[i]["_measurement"]
    cleanedTrainingSessions.push(session)
  }

  //get the teams that the givne player joined in
  const teams =  await executeInflux(queryPlayersTeams, queryClient);
  const cleanedTeams:string[] = []
  for(let i = 0; i < teams.length; i++ )
  {
    cleanedTeams.push(teams[i]["_measurement"])
  }

  //define the structure of the API that will be returned to fronend
  const homepageInfo = {
    "name": "",
    "email": "",
    "dob": '',
    'nationality':'',
    'height':0,
    'weight':0,
    'teams':['', '' ],
    'trainingSessions':[{}, {}],
  }
  homepageInfo['name'] = PLAYER 
  homepageInfo['teams'] = cleanedTeams
  homepageInfo['trainingSessions'] = cleanedTrainingSessions

  return homepageInfo
}

async function getTrainingSessionsAPI(username: string) {
  //get the information of all the training sessions of given players
  let PLAYER = username;
  let queryPlayersSessions  = readFileSync(resolve(__dirname, '../../queries/players_sessions.flux'), { encoding: 'utf8' });
  queryPlayersSessions = interpole(queryPlayersSessions, [PLAYER]);

  const trainingSessions = await executeInflux(queryPlayersSessions, queryClient);
  const cleanedTrainingSessions:any[] = [];
  for (let i = 0; i<trainingSessions.length; i++ )
  {
    const session = {
      "playerName": "",
      "sessionName": "",
      "sessionDate": "",
      "sessionTime": "",
      "teamName": "",
    } as SessionResponseType;
    session["playerName"] = trainingSessions[i]["Player Name"]
    session["sessionName"] = trainingSessions[i]["Session"].split(" ")[0]
    session["sessionDate"] = moment(trainingSessions[i]["_time"]).format("DD-MMM-YYYY")
    session["sessionTime"] = moment(trainingSessions[i]["_time"]).format("HH:MM")
    session["teamName"] = trainingSessions[i]["_measurement"]
    cleanedTrainingSessions.push(session);
  }  
  return cleanedTrainingSessions;
}

//function to run the InfluxDB querry
const executeInflux = async (fluxQuery: string, queryClient: QueryApi ) => {
  let sessionArray : any[] = []; 

  await new Promise<void>((resolve, reject) => {
    let rejected = false;
    queryClient.queryRows(fluxQuery, {
      next: (row, tableMeta) => {
        const tableObject = tableMeta.toObject(row)
        sessionArray.push(tableObject)
      },
      error: (error) => {
        rejected = true;
        reject(error);
      },
      complete: () => {
        console.log('\nQuery Successfully')
        if (!rejected) {
          resolve();
        }
      },
    })
  });
  return sessionArray
}


















