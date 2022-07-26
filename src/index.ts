import { InfluxDB } from '@influxdata/influxdb-client';
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import console from 'console';
import sqlite3 from 'sqlite3';
import bindGetTeams from './team';
import bindGetTrainingSessions from './trainingSession';
import bindGetProfile, { bindPutProfile } from './profile';
import 'dotenv/config';

declare module 'express-session' {
  interface SessionData {
    username: string;
  }
}

function startExpressServer() {
  const app = express();
  const port = process.env.SD_SERVER_PORT || 3000;
  //SQL
  const db = new sqlite3.Database('test.db');
  //Influx
  const DBtoken = process.env.SD_SERVER_INFLUX_API_KEY;
  const url = 'https://ap-southeast-2-1.aws.cloud2.influxdata.com';
  const client = new InfluxDB({ url: url, token: DBtoken });
  const org = process.env.SD_SERVER_INFLUX_EMAIL as string;
  const queryClient = client.getQueryApi(org);

  app.use(bodyParser.json()); //to read the body of the request from backend
  app.use(
    session({
      secret: 'this is a key',
      resave: false,
      saveUninitialized: false,
    }),
  );  

  // bind the API endpoints
  // GET requests
  bindGetTeams(app, db, queryClient);
  bindGetTrainingSessions(app, db, queryClient);
  bindGetProfile(app, db, queryClient);

  // PUT requests
  bindPutProfile(app, db, queryClient);
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
  });

  return app;
}

if (require.main === module) {
  startExpressServer();
}

export default startExpressServer;