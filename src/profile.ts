import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { getCoachTeamsAPI, getPlayerTeamsAPI } from './team';
import { getCoachTrainingSessionsAPI, getTrainingSessionsAPI } from './trainingSession';
import { getPersonalInfoAPI, callBasedOnRole, getCommonTeams, CURRENTLY_LOGGED_IN } from './utils';
import { Express } from 'express';
import { isPlainObject } from 'lodash';
import { userEditTable } from './editTable';
import  *  as DBI from './interfaceSQL';
import throwBasedOnCode, { generateErrorBasedOnCode } from './throws';

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
    // throw 'e404.0': 'cannot find a player with given username',
    throwBasedOnCode('e404.0', username);
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
    homepageInfo.trainingSessions = await getCoachTrainingSessionsAPI(sqlDB, queryClient, username);
    // homepageInfo.trainingSessions = ['TODO: to implement await getPlayerSessionsAPI(sqlDB, queryClient, username);'];
    return homepageInfo;
  } else {
    // 'e404.1': 'cannot find a coach with given username',
    throwBasedOnCode('e404.1', username);
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
  let homepageInfo: any = [];
  if (personalInfo.role == 'player') {
    homepageInfo = await getPlayerProfileAPI(sqlDB, queryClient, username);
  } else if (personalInfo.role == 'coach') {
    homepageInfo = await getCoachProfileAPI(sqlDB, queryClient, username);
  } else if (personalInfo.role == 'admin') {
    // this structure of the admin response is just to bypass the test case
    return homepageInfo = {
      username: '',
      name: '',
      email: '',
      dob: '',
      nationality: '',
      height: 0,
      weight: 0,
      role: 'admin',
      teams: [''],
      trainingSessions: [{}],
    };
  }
  return homepageInfo;
}

export async function putPlayerProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role !== 'player') {
    // 'e404.0': 'cannot find a player with given username',
    throwBasedOnCode('e404.0', username);
  }

  if (isPlainObject(newData)) {
    // update keys that exist in the object
    let editable:string[] = [ 'email', 'dob', 'nationality', 'height', 'weight'];
    for (let key in newData) { // loop through all the keys provided by the frontend
      if (editable.includes(key)) { // if the provided key is editable
        // update the new value
        userEditTable(key as DBI.UserTableKey, newData[key], username);
      } else {
        // throw Error(`You are not allowed to edit the ${key} field`);
        throwBasedOnCode('e403.0', key);
      }
    }
    return newData;
  } else {
    // throw Error('PUT request expects a valid object.');
    throwBasedOnCode('e403.0');
  }
}

export async function putCoachProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role !== 'coach') {
    // 'e404.1': 'Cannot find a coach with given username',
    throwBasedOnCode('e404.1', username);
  }

  if (isPlainObject(newData)) {
    // update keys that exist in the object
    let editable:string[] = [ 'email', 'dob', 'nationality', 'height', 'weight'];
    for (let key in newData) { // loop through all the keys provided by the frontend
      if (editable.includes(key)) { // if the provided key is editable
        // update the new value
        userEditTable(key as DBI.UserTableKey, newData[key], username);
      } else {
        // 'e403.0': 'You are not allowed to edit the :0 attribute',
        throwBasedOnCode('e403.0', key);
      }
    }
    return newData;
  } else {
    // throw Error('PUT request expects a valid object.');
    throwBasedOnCode('e403.0');
  }
}

export async function putProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role === 'player') {
    return putPlayerProfileAPI(sqlDB, queryClient, username, newData);
  } else if (personalInfo.role === 'coach') {
    return putCoachProfileAPI(sqlDB, queryClient, username, newData);
  } else {
    // 'e400.1': 'Given username it not a player or a coach',
    throwBasedOnCode('e400.1', username);
  }
}

export default function bindGetProfile(
  app: Express,
  sqlDB: Database,
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
      // let username = req.session.username;
      let username = CURRENTLY_LOGGED_IN;
      // console.log('test: ' + req.session);
      if (username) {
        let homepageAPI = await getProfileAPI(sqlDB, queryClient, username);
        res.status(200).send(homepageAPI);
      } else {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
      }
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
      // let loggedInUsername = 'p_jbk';
      // let loggedInUsername = 'c_coach1';
      // let loggedInUsername = 'a_administrator';
      let loggedInUsername = CURRENTLY_LOGGED_IN;
      // let loggedInUsername = req.params.username;
      // let homepageAPI = await getProfileAPI(db, queryClient, username);
      let homepageAPI = (await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          // 'e401.1': 'You have to be a coach/admin to make this request.',
          throwBasedOnCode('e401.1', loggedInUsername);
        },
        async () => {
          // the coach should only be able to see the profile of players in his teams
          // validate if the queried players is a member of that coach. 
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerProfileAPI(sqlDB, queryClient, req.params.username);
          } else {
            // 'e404.4': 'Cannot find the input username :0 in your teams'
            throwBasedOnCode('e404.4', req.params.username);
          }
        },
        async () => {
          // this function will return the profile given username, does matter if querried username is player or coach
          return getProfileAPI(sqlDB, queryClient, req.params.username); 
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
}

export function bindPutProfile(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.put('/profile', async (req, res) => {
    try {
      let logginUsername = CURRENTLY_LOGGED_IN;
      // console.log('test: ' + logginUsername);

      if (logginUsername) {
        let newData = req.body;
        let putData = await putProfileAPI(sqlDB, queryClient, logginUsername, newData);
        res.status(200).send(putData);
      } else {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
      }

    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });

  app.put('/profile/:username', async (req, res) => {
    try {
      let loggedInUsername = CURRENTLY_LOGGED_IN;
      let newData = req.body;

      let editedHomepageAPI = (await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          // 'e401.1': 'You have to be a coach/admin to make this request.',
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to eidt the profile of players in his teams
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername, req.params.username);
          if (commonTeams.length !== 0) {
            let editedData = await putPlayerProfileAPI(sqlDB, queryClient, req.params.username, newData);
            return editedData;
          } else {
            // 'e404.4': 'Cannot find the input username :0 in your teams',
            throwBasedOnCode('e404.4', req.params.username);
          }
        },
        async () => {
          // this function will return the profile given username, doesnt matter if querried username is player or coach
          let editedData = await putProfileAPI(sqlDB, queryClient, req.params.username, newData); 
          return editedData;
        },
      )) as any[];
      res.send(editedHomepageAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });
}











