import { consoleLogger, QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { getCoachTeamsAPI, getPlayerTeamsAPI } from './team';
import { getTrainingSessionsAPI } from './trainingSession';
import { getPersonalInfoAPI, callBasedOnRole, DEFAULT_USERNAME } from './utils';
import { Express } from 'express';
import { isPlainObject } from 'lodash';
import { updateTable, userEditTable} from './editTable';

//TODO: getPlayerProfileAPI
//TODO: getCoachProfileAPI
//TODO: fix getProfileAPI

export async function getPlayerProfileAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  if (personalInfo.role == 'player') {
    //define the structure of the API that will be returned to frontend
    const homepageInfo = {
      username: '',
      name: '',
      email: '',
      dob: '',
      nationality: '',
      height: 0,
      weight: 0,
      role: '',
      teams: [''],
      trainingSessions: [{}],
    };
    homepageInfo.username = username;
    homepageInfo.name = personalInfo.name;
    homepageInfo.email = personalInfo.email;
    homepageInfo.dob = personalInfo.dob;
    homepageInfo.nationality = personalInfo.nationality;
    homepageInfo.height = personalInfo.height;
    homepageInfo.weight = personalInfo.weight;
    homepageInfo.role = personalInfo.role;
    homepageInfo.teams = await getPlayerTeamsAPI(sqlDB, queryClient, username);
    homepageInfo.trainingSessions = await getTrainingSessionsAPI(sqlDB, queryClient, username);
    return homepageInfo;
  } else {
    throw new Error('cannot find a player with given username');
  }
}

export async function getCoachProfileAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  if (personalInfo.role == 'coach') {
    //define the structure of the API that will be returned to frontend
    const homepageInfo = {
      username: '',
      name: '',
      email: '',
      dob: '',
      nationality: '',
      height: 0,
      weight: 0,
      role: '',
      teams: [''],
      trainingSessions: [{}],
    };
    homepageInfo.username = username;
    homepageInfo.name = personalInfo.name;
    homepageInfo.email = personalInfo.email;
    homepageInfo.dob = personalInfo.dob;
    homepageInfo.nationality = personalInfo.nationality;
    homepageInfo.height = personalInfo.height;
    homepageInfo.weight = personalInfo.weight;
    homepageInfo.role = personalInfo.role;
    homepageInfo.teams = await getCoachTeamsAPI(sqlDB, queryClient, username);
    homepageInfo.trainingSessions = await getTrainingSessionsAPI(sqlDB, queryClient, username);
    return homepageInfo;
  } else {
    throw new Error('cannot find a coach with given username');
  }
}

export async function getProfileAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  let playerName = personalInfo.name;
  //get the information of all the training sessions of given players
  const trainingSession = await getTrainingSessionsAPI(sqlDB, queryClient, username);
  //define the structure of the API that will be returned to frontend
  const homepageInfo = {
    username: '',
    name: '',
    email: '',
    dob: '',
    nationality: '',
    height: 0,
    weight: 0,
    role: '',
    teams: [''],
    trainingSessions: [{}],
  };
  homepageInfo.username = username;
  homepageInfo.name = playerName;
  homepageInfo.email = personalInfo.email;
  homepageInfo.dob = personalInfo.dob;
  homepageInfo.nationality = personalInfo.nationality;
  homepageInfo.height = personalInfo.height;
  homepageInfo.weight = personalInfo.weight;
  homepageInfo.role = personalInfo.role;


  await callBasedOnRole(sqlDB, username, 
    async () => {
      homepageInfo.teams = await getPlayerTeamsAPI(sqlDB, queryClient, username);
      homepageInfo.trainingSessions = trainingSession;
    }, 
    async () => { 
      homepageInfo.teams = await getCoachTeamsAPI(sqlDB, queryClient, username);
      homepageInfo.trainingSessions = ['TODO: to be implemented'];
    },
  );
  return homepageInfo;
}

export default function bindGetProfile(
  app: Express,
  db: Database,
  queryClient: QueryApi,
) {
  app.get('/profile', async (req, res) => {
    /* 
    username should be set to the username in the session variable if it is not provided in the request
    Currently, the default users that will be returned is Warren
    */
    try {
      // const sess = req.session;
      // let username = sess.username;
      let username = DEFAULT_USERNAME;

      let homepageAPI = await getProfileAPI(db, queryClient, username);
      res.send(homepageAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });

  app.get('/profile/:username', async (req, res) => {
    try {
      let loggedInUsername = 'a_administrator';
      // let username = req.params.username;
      // let homepageAPI = await getProfileAPI(db, queryClient, username);
      let homepageAPI = (await callBasedOnRole(
        db,
        loggedInUsername!,
        async () => {
          throw new Error('You are not allowed to make the request');
        },
        async () => {
          // the coach should only be able to see the profile of player
          // TODO: validate if the queried players is a member of that coach. 
          // return getPlayerProfileAPI(db, queryClient, req.params.username);
          // currently, the coach can see the profile of all players for testing purpose 
          return getPlayerProfileAPI(db, queryClient, req.params.username);
        },
        async () => {
          // this function will return the profile given username, does matter if querried username is player or coach
          return getProfileAPI(db, queryClient, req.params.username); 
        },
      )) as any[];
      res.send(homepageAPI);

    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });

  app.put('/profile', async (req, res) => {
    try {
      let newData = req.body;
      if (isPlainObject(newData)) {
        // update keys that exist in the object
        let editable:string[] = [ 'email', 'dob', 'nationality', 'height', 'weight'];
        for (let key in newData) {  // loop through all the keys provided by the frontend
          if (editable.includes(key)) { // if the provided key is editable
            // TODO: update the new value
            console.log(key, newData[key]);
            userEditTable(key, newData[key], DEFAULT_USERNAME);
          } else {
            throw new Error(`You are not allowed to edit the ${key} field`);
          }
        }
        res.send(newData);
      } else {
        throw new Error('PUT request expects a valid object.');
      }
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });
}
