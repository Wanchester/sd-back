import { QueryApi } from '@influxdata/influxdb-client';
// import moment from 'moment';
import { Database } from 'sqlite3';
import { getPersonalInfoAPI, executeInflux, callBasedOnRole, getCommonTeams } from './utils';
import { SessionResponseType } from './interface';
import { Express } from 'express';
import { getCoachTeamsAPI } from './team';
import { buildQuery, getDuration, getSessionBeginningAndEnd, InfluxQuery } from './utilsInflux';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';
import { getTrainingSessionPlayerNamesAPI, getTrainingSessionStatisticsAPI } from './trainingSessionStats';

async function cleanTrainingSessionsWithQuery(queryClient: QueryApi, queryFromFrontend: InfluxQuery) {
  const trainingSessions = await executeInflux(buildQuery(queryFromFrontend), queryClient);
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

  //possibly empty...
  return cleanedTrainingSessions;
}

export async function getTeamsTrainingSessionsAPI(queryClient: QueryApi, teamName: string) {
  return cleanTrainingSessionsWithQuery(queryClient, { teams: [teamName], get_unique: 'sessions' });
}


export async function getTrainingSessionsAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  username: string,
): Promise<SessionResponseType[] | undefined> {
  //role management and output
  const output = await callBasedOnRole(sqlDB, username, 
    //player
    async () => {
      const userInfo = await getPersonalInfoAPI(sqlDB, username);//callBasedOnRole does this too...
      const trainingSessions = await cleanTrainingSessionsWithQuery(queryClient, { names: [userInfo.name], get_unique: 'sessions' }); 
      return trainingSessions;
    },
    //coach
    async () => {
      //coach queries based on his assigned teams in SQL
      const coachTeamNames = await getCoachTeamsAPI(sqlDB, queryClient, username);
      const trainingSessions = await cleanTrainingSessionsWithQuery(queryClient, { teams: coachTeamNames, get_unique: 'sessions' });
      return trainingSessions;
    },
    //admin
    async () => {
      //getting ALL sessions for admin
      const trainingSessions = await cleanTrainingSessionsWithQuery(queryClient, { get_unique: 'sessions' });
      return trainingSessions;
    },
  );
  return output;
}

export default function bindGetTrainingSessions(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  // app.get('/trainingSessions?fullStats=:fullStats&teamName=:teamName&sessionName=:sessionName', async (req, res) => {
  app.get('/trainingSessions', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = sess.username;
      // let username = CURRENTLY_LOGGED_IN;
      if ((req.query as any).fullStats) {   // app.get('/trainingSessions?fullStats=:fullStats&teamName=:teamName&sessionName=:sessionName', async (req, res) => { 
        const loggedInUsername = req.session.username;  
        if (loggedInUsername === undefined) {
          res.status(401).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e401.0').message,
          });
          return;
        }
        const loggedInPersonalInfo = await getPersonalInfoAPI(sqlDB, loggedInUsername);
  
        const teamName = (req.query as any).teamName;
        const sessionName = (req.query as any).sessionName;
        // const teamName = req.body.teamName;
        // const sessionName = req.body.sessionName;
        
        //teamName validation
        const getTeamQuery = buildQuery({ get_unique: 'teams' } );
        const team = await executeInflux(getTeamQuery, queryClient);
        console.log('team: ', team);
        const teamsList: string[] = [];
        team.forEach(row => 
          teamsList.push(row._measurement),
        );
        console.log(teamsList);
        if (!teamsList.includes(teamName)) {
          throwBasedOnCode('e400.14', teamName);
        }

        // let namesFromInflux: string[] = [];
        // await team.then(list => 
        //   list.forEach(row => 
        //     namesFromInflux.push(row['Player Name']),
        //   ),
        // rejectedReason => {
        //   //influx problem
        //   throwBasedOnCode('e500.0', rejectedReason, 
        //     '\nThis error shouldn\'t happen. trainingSession.ts:163');
        // });

        let trainingSessionsAPI = await callBasedOnRole(
          sqlDB,
          loggedInUsername!,
          async () => {
            const playerList = await getTrainingSessionPlayerNamesAPI(queryClient, teamName, sessionName);
            if ( !playerList.includes(loggedInPersonalInfo.name )) {
              res.status(400).send({
                'name': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).name,
                'error': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).message,
              });
              return;
            }
            return getTrainingSessionStatisticsAPI(queryClient, teamName, sessionName);
          },
          async () => {
            let coachTeams = await getCoachTeamsAPI(sqlDB, queryClient, loggedInUsername);
            // ensure the coach do coach the queried the team in querried training session
            if (!coachTeams.includes(teamName)) {
              res.status(400).send({
                'name': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).name,
                'error': generateErrorBasedOnCode('e400.10', loggedInUsername, teamName, sessionName).message,
              });
              return;
            }
            return getTrainingSessionStatisticsAPI(queryClient, teamName, sessionName);
          },
          async () => {
            return getTrainingSessionStatisticsAPI(queryClient, teamName, sessionName);
          },
        );
        res.send(trainingSessionsAPI);        
      } else {  // only /trainingSessions
        let loggedInUsername =  req.session.username;
        if (loggedInUsername === undefined) {
          res.status(401).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e401.0').message,
          });
          return;
        }

        let trainingSessionsAPI = await getTrainingSessionsAPI(
          sqlDB,
          queryClient,
          loggedInUsername,
        );
        res.send(trainingSessionsAPI);
      }
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
    
  });

  app.get('/trainingSessions/:username', async (req, res) => {
    try {
      // let loggedInUsername = 'a_administrator'; // username will be set to the username from session variable when log in feature is implemented
      // let loggedInUsername = CURRENTLY_LOGGED_IN;
      // let username = req.params.us
      //right now, just let the username = 'a_administrator' so that it has the right to see the teams list of all players.
      const queriedUsername = req.params.username;
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      let trainingSessionsAPI = await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to see the training sessions of player
          // currently, the coach can see the training sessions of all players and coach for testing purpose 
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername!, req.params.username);
          if (commonTeams.length !== 0) {
            return getTrainingSessionsAPI(sqlDB, queryClient, req.params.username);
          } else {
            // throw new Error('Cannot find the input username in your teams');
            throwBasedOnCode('e400.8', queriedUsername);
          }
        },
        async () => {
          return getTrainingSessionsAPI(sqlDB, queryClient, req.params.username);
        },
      ) as any[];
      res.send(trainingSessionsAPI);
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}
