import { buildQuery, getDuration, getSessionBeginningAndEnd, InfluxQuery } from './utilsInflux';
import { buildQueryWithPermissions } from './graph';
import { Express } from 'express';
import  { Database } from 'sqlite3';
import { QueryApi } from '@influxdata/influxdb-client';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';
import { executeInflux, getPersonalInfoAPI, inputValidate } from './utils';
import _ from 'lodash';
import { SessionResponseType } from './interface';


export default function bindGetDynamicTrainingSessions(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.post('/trainingSessions', async (req, res) => {
    try {
      //must log in
      if (req.session.username === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      const loggedInUsername = req.session.username; 
      const loggedInUser = await getPersonalInfoAPI(sqlDB, loggedInUsername);
      const reqBody: InfluxQuery = req.body;

      //prevent empty request body
      if (_.isEmpty(reqBody)) {
        throwBasedOnCode('e400.0');
      }

      if (loggedInUser.role == 'player') {
        if ( reqBody.names !== undefined && reqBody.names.length > 0) {
          if (reqBody.names[0] !== loggedInUser.name || reqBody.names.length !== 1) {
            throwBasedOnCode('e401.1');
          }
        } 
      }

      const promiseList: Promise<void>[] = [];
      //validate player 
      if ( reqBody.names !== undefined) {
        const validPlayer = inputValidate(sqlDB, queryClient, reqBody.names, 'players');
        promiseList.push(validPlayer);
      }
      //validate team
      if ( reqBody.teams !== undefined) {
        const validTeam = inputValidate(sqlDB, queryClient, reqBody.teams, 'teams');
        promiseList.push(validTeam);
      }
      //validate sessions
      if ( reqBody.sessions !== undefined) {
        const validSession = inputValidate(sqlDB, queryClient, reqBody.sessions, 'sessions');
        promiseList.push(validSession);
      }
      await Promise.all(promiseList);

      reqBody.fields = ['Height', 'Velocity', 'Distance', 'Work Rate', '3dAccuracy', '2dAccuracy', 'Run Distance', 'Sprint Distance', 'Total Run Distance', 'Total Sprint Distance', 'Total Work Rate', 'lat', 'lon'];
      reqBody.get_unique = 'sessions';
      const validInfluxQuery = await buildQueryWithPermissions(sqlDB, queryClient, loggedInUsername, reqBody);

      //prepare the skeleton and duration
      const trainingSessions = await executeInflux(buildQuery(validInfluxQuery), queryClient);
      const cleanedTrainingSessions: SessionResponseType[] = [];
      const sessionTimePromises: Promise<{ name: string; beginning: any; end: any; }>[] = [];
    
      //send requests for session times
      for (let sessionResponse of trainingSessions) {
        sessionTimePromises.push(getSessionBeginningAndEnd(sessionResponse.Session, queryClient));
      }
    
      //ready objects and assign sessionName, teamName
      for (let i = 0; i < trainingSessions.length; i++) {
        const aSession = {
          sessionName: '',
          sessionStart: '',
          sessionStop: '',
          teamName: '',
          duration: '',
        } as SessionResponseType;
        aSession.sessionName = trainingSessions[i].Session;
        aSession.teamName = trainingSessions[i]._measurement;
        cleanedTrainingSessions.push(aSession);
      }
    
      //await and assign times
      const sessionTimes = await Promise.all(sessionTimePromises);
      const keyedTimes = Object.fromEntries(sessionTimes.map((o) => [o.name, o]));
    
      for (const cleanedSession of cleanedTrainingSessions) {
        cleanedSession.sessionStart = keyedTimes[cleanedSession.sessionName].beginning;
        cleanedSession.sessionStop = keyedTimes[cleanedSession.sessionName].end;
        cleanedSession.duration = getDuration(cleanedSession.sessionStart, cleanedSession.sessionStop);
      }
      res.status(200).send(cleanedTrainingSessions);
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}
