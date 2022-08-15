import { InfluxDB } from '@influxdata/influxdb-client';
import express from 'express';
import bodyParser from 'body-parser';
import console from 'console';
import sqlite3 from 'sqlite3';
import bindGetTeams from './team';
import bindGetTrainingSessions from './trainingSession';
import bindGetProfile, { bindPutProfile } from './profile';
import 'dotenv/config';
// import bindGetStatistic from './playerStatistic';
import bindLoginAPI from './login';
// import { bindGetTeamPlayers } from './teamPage';

function startExpressServer() {
  const app = express();
  const port = process.env.SD_SERVER_PORT || 3000;
  //SQL
  const db = new sqlite3.Database('test.db');
  db.configure('busyTimeout', 5000);
  //Influx
  const DBtoken = process.env.SD_SERVER_INFLUX_API_KEY;
  const url = 'https://ap-southeast-2-1.aws.cloud2.influxdata.com';
  const client = new InfluxDB({ url: url, token: DBtoken });
  const org = process.env.SD_SERVER_INFLUX_EMAIL as string;
  const queryClient = client.getQueryApi(org);

  app.use(bodyParser.json());

  // Login endpoints must be bound first to make session variables available
  // for the rest of the requests
  bindLoginAPI(app, db);

  // bind the API endpoints
  // GET requests
  bindGetTeams(app, db, queryClient);
  bindGetTrainingSessions(app, db, queryClient);
  bindGetProfile(app, db, queryClient);
  // bindGetStatistic(app, db, queryClient);
  // bindGetTeamPlayers(app, db, queryClient);

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