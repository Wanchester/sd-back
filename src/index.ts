import { ClientOptions, InfluxDB, Point, QueryApi } from "@influxdata/influxdb-client";
import express from 'express';
import { resolve } from "path";

const app = express();
const port = process.env.PORT || 3000;
const DBtoken = process.env.INFLUXDB_TOKEN || "SKCqeTd4N-0fYfMPo37Ro8Pv_d-PQX4SoEpfYMTyCdV2Ucjif9RNy-5obta8cQRqKlpB25YvOKkT4tdqxw__Gg=="  
const url ='https://ap-southeast-2-1.aws.cloud2.influxdata.com'
const client = new InfluxDB({url: url, token: DBtoken})
const session = require("express-session")
const dummyObject = {
  "name": "sesison1_dummy",
  "sesison_ id": "ss01",
  "start": '2019-05-09T12:46:02.787152896Z'
}

let org = 'qethanmoore@gmail.com'
let bucket = 'testBucket'

app.use(session ({
  secret: "this is a key",
  resave:false,
  saveUninitialized: false
}))


app.get('/', (req, res) => {
  res.send("hello world");
});


app.get('/dummyAPI', (req, res) => {
  res.send(dummyObject)
});


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});


let queryClient = client.getQueryApi(org)

let fluxQuery1 = `from(bucket: "${bucket}")
 |> range(start: -1y)
 |> filter(fn: (r) => r._measurement == "measurement1")`

let fluxQuery2 = `from(bucket: "test")
|>range(start: -3y)
|>group(columns:["Session"], mode:"by")
|>limit(n: 1)
|>yield()`

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

app.get('/test', async (req, res) => {
  const result = await executeInflux(fluxQuery2, queryClient);
  console.log(result);
  res.send(result)

  for (let i = 0; i < result.length; i++) {
    console.log(typeof(result[i]))
  }
});



