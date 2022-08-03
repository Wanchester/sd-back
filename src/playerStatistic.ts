import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { CURRENTLY_LOGGED_IN, executeInflux } from './utils';
import { Express } from 'express';
import { readFileSync } from 'fs';
import interpole from 'string-interpolation-js';
import { resolve as pathResolve } from 'path';

export async function getStatistic(
  queryClient: QueryApi, 
  playerUsername: string, 
  teamName: string,
  field: string,
  startTime: Date,
  stopTime: Date,
  window?: number,
) {
  let queryStatistic = readFileSync(
    pathResolve(__dirname, '../../queries/playerTeamSessionFieldStartStopWindowMean.flux'),
    { encoding: 'utf8' },
  );
  
  queryStatistic = interpole(queryStatistic, [playerUsername, teamName, field, Math.floor(startTime.getTime() / 1000), Math.floor(stopTime.getTime() / 1000), window]);
  console.log(queryStatistic);
  
  
  let statistic = await executeInflux(queryStatistic, queryClient);
  // console.log(statistic);
  
  let cleanedStatistics: any[] = [];
  for (let i = 0; i < statistic.length; i++) {
    cleanedStatistics.push([statistic[i]._start,  statistic[i]._value]);
  }
  return cleanedStatistics;
  

}

export default function bindGetStatistic(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.get('/statistic', async (req, res) => {
    /* 
    username should be set to the username in the session variable if it is not provided in the request
    Currently, the default users that will be returned is Warren
    */
    try {
      // const sess = req.session;
      // let username = sess.username;
      let username = CURRENTLY_LOGGED_IN;

      let statistic = await getStatistic(
        queryClient, 
        'Warren',
        'TeamBit',
        'Velocity',
        new Date(0),
        new Date(),
        30,
      );
      res.send(statistic);
    } catch (error) {
      console.log(error);
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });
}



