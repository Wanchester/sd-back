import { ClientOptions, InfluxDB, Point, QueryApi } from "@influxdata/influxdb-client";
import express from 'express';
import { resolve } from "path";
import moment from "moment"

const app = express();
const port = process.env.PORT || 3000;
const DBtoken = process.env.INFLUXDB_TOKEN || "SKCqeTd4N-0fYfMPo37Ro8Pv_d-PQX4SoEpfYMTyCdV2Ucjif9RNy-5obta8cQRqKlpB25YvOKkT4tdqxw__Gg=="  
const url ='https://ap-southeast-2-1.aws.cloud2.influxdata.com'
const client = new InfluxDB({url: url, token: DBtoken})
const session = require("express-session")


let org = 'qethanmoore@gmail.com'
let bucket = 'testBucket'
let queryClient = client.getQueryApi(org)

app.use(
  session ({
    secret: "this is a key",
    resave:false,
    saveUninitialized: false
  })
)

app.get('/:id', async (req, res) => {
  console.log((<any>req).username);
  //if the username is not provided, then username is Warren
  (<any>req).session.username =  (<any>req).username
  if((<any>req).session.username == undefined)
  {
    (<string> (<any>req).session.username) = 'Warren'
  }
  let PLAYER = (<string>(<any>req).session.username)

  let queryPlayersSessions  = `from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["Player Name"] == "${PLAYER}")
    |>group(columns: ["Session"], mode: "by")
    |>limit(n: 1)`

  let queryPlayersTeams = `from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["Player Name"] == "${PLAYER}")
    |>group(columns: ["_measurement"], mode:"by")
    |>limit(n: 1)`

  //get the information of all the training sessions of given players
  const trainingSessions = await executeInflux(queryPlayersSessions, queryClient);
  const cleanedTrainingSessions:any[] = []
  for(let i = 0; i<trainingSessions.length; i++ )
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

  //get the teams that the givne player joined in
  const teams =  await executeInflux(queryPlayersTeams, queryClient);
  const cleanedTeams:string[] = []
  for(let i = 0; i<teams.length; i++ )
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

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});

//function to run the InfluxDB querry
const executeInflux = async (fluxQuery: string, queryClient: QueryApi ) => {
  let sessionArray : any[] = [] 

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






























