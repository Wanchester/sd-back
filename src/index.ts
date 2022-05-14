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

let PLAYER = 'Warren'  

app.get('/', async (req, res) => {
  if((<any>req).session.username != undefined)
  {
    PLAYER = (<string> (<any>req).session.username)
  }

  const sessionsArray = await executeInflux(querrySessionsOfPlayer, queryClient);
  const cleanedSessionsInfo:any[] = []
  for(let i = 0; i<sessionsArray.length; i++ )
  {
    const session = {
      "playerName": "",
      "sessionName": null,
      "sessionDate": "",
      "sessionTime": "",
      "teamName": "",
    }
    session["playerName"] = sessionsArray[i]["Player Name"]
    session["sessionName"] = sessionsArray[i]["Session"].split(" ")[0]
    session["sessionDate"] = moment(sessionsArray[i]["_time"]).format("DD-MMM-YYYY")
    session["sessionTime"] = moment(sessionsArray[i]["_time"]).format("HH:MM")
    session["teamName"] = sessionsArray[i]["_measurement"]
    cleanedSessionsInfo.push(session)
  }
  res.send(cleanedSessionsInfo)
  //console.log(sessionsArray)
});


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});

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
        console.log('\nSuccess')
        if (!rejected) {
          resolve();
        }
      },
    })
  });
  return sessionArray
}



const tomCruise = {
  "name": "Tom Cruise",
  "email": "tomCruise@gmail.com",
  "dob": '01-01-1970'
}






















const dummyObject = {
  "name": "sesison1_dummy",
  "sesison_ id": "ss01",
  "start": '2019-05-09T12:46:02.787152896Z'
}

app.get('/test', (req, res) => {
  (<any>req).session.username = "test username"
  console.log((<any>req).session)
  res.send((<any>req).session)
});



app.get('/dummyAPI', (req, res) => {
  //console.log(req.session)
  res.send(dummyObject)
});








app.get('/test', async (req, res) => {
  const result = await executeInflux(fluxQuery2, queryClient);
  console.log(result);
  res.send(result)

  for (let i = 0; i < result.length; i++) {
    console.log(typeof(result[i]))
  }
});


let fluxQuery1 = `from(bucket: "${bucket}")
 |> range(start: -1y)
 |> filter(fn: (r) => r._measurement == "measurement1")`

let fluxQuery2 = `from(bucket: "test")
|>range(start: -3y)
|>group(columns:["Session"], mode:"by")
|>limit(n: 1)
|>yield()`


let querrySessionsOfPlayer  = `from(bucket: "test")
|>range(start:-3y)
|>filter(fn: (r)=>r["Player Name"] == "${PLAYER}")
|>group(columns: ["Session"], mode: "by")
|>limit(n: 1)`

let querryTeamsOfPlayer = `from(bucket: "test")
  |>range(start:-3y)
  |>filter(fn: (r)=>r["Player Name"] == "${PLAYER}")
  |>group(columns: ["_measurement"], mode:"by")
  |>limit(n: 1)`

/*
app.get('/', (req, res) => {
  
  const userId = getUserId(req);
  const getTeam = await querryTeamsOfPlayer(userId);

  {
    name: "Tom Cruise",
    email: "asdfasdf@adfasdf",
    dob: "12/12/12",
    nationality: "asdfsadf",
    teams: [
      {
        name: "team1"
      },
      {
        name: "team2"
      }
    ],
    sessions: [
      {
        date: "12312",
        time: "12321"
      }
    ]
  }
  
  const getSession = await querrySessionsOfPlayer(userId);
  
 res.send("123")
});
*/
  

app.get('/sessionsOfPlayer', async (req, res) => {
    const sessionsArray = await executeInflux(querrySessionsOfPlayer, queryClient);

    res.send(sessionsArray)
});

app.get('/teamsOfPlayer', async (req, res) => {
  const teamsArray = await executeInflux(querryTeamsOfPlayer, queryClient);
  res.send(teamsArray)
});