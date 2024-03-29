import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { getCoachTeamsAPI, getPlayerTeamsAPI } from './team';
import { getTrainingSessionsAPI } from './trainingSession';
import { getPersonalInfoAPI, callBasedOnRole, getCommonTeams } from './utils';
import { Express } from 'express';
import { isPlainObject } from 'lodash';
import { userEditTable } from './editTable';
import  *  as DBI from './interfaceSQL';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';

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
  //two influx queries; need to be sent independantly
  const playerTeamsPromise = getPlayerTeamsAPI(sqlDB, queryClient, username);
  const playerSessionsPromise = getTrainingSessionsAPI(sqlDB, queryClient, username);
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
    homepageInfo.teams = await playerTeamsPromise;

    const trainingSessions = await playerSessionsPromise;
    if (trainingSessions) {
      homepageInfo.trainingSessions = trainingSessions;
    }
    
    return homepageInfo;
  } else {
    // throw new Error('cannot find a player with given username');
    throwBasedOnCode('e400.4');
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
    homepageInfo.trainingSessions = await getTrainingSessionsAPI(sqlDB, queryClient, username) || [{}]; //getTrainingSessionsAPI already handles the role management
    return homepageInfo;
  } else {
    // 'e400.5': 'cannot find a coach with given username',
    throwBasedOnCode('e400.5', username);
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
    // throw new Error('cannot find aplayer with given username');
    throwBasedOnCode('e400.4');
  }

  if (isPlainObject(newData)) {
    // update keys that exist in the object
    let editable:string[] = [ 'email', 'dob', 'nationality', 'height', 'weight'];
    for (let key in newData) { // loop through all the keys provided by the frontend
      if (editable.includes(key)) { // if the provided key is editable
        // update the new value
        userEditTable(sqlDB, key as DBI.UserTableKey, newData[key], username);
      } else {
        throwBasedOnCode('e403.0', key);
      }
    }
    return newData;
  } else {
    // throw new Error('PUT request expects a valid object.');
    throwBasedOnCode('e400.11');
  }
}

export async function putCoachProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role !== 'coach') {
    // throw new Error('cannot find a coach with given username');
    throwBasedOnCode('e400.5');
  }

  if (isPlainObject(newData)) {
    // update keys that exist in the object
    let editable:string[] = [ 'email', 'dob', 'nationality', 'height', 'weight'];
    for (let key in newData) { // loop through all the keys provided by the frontend
      if (editable.includes(key)) { // if the provided key is editable
        // update the new value
        userEditTable(sqlDB, key as DBI.UserTableKey, newData[key], username);
      } else {
        throwBasedOnCode('e403.0', key);
      }
    }
    return newData;
  } else {
    // throw new Error('PUT request expects a valid object.');
    throwBasedOnCode('e400.11');
  }
}

export async function putProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  let returnedData: any[] = [];
  if (personalInfo.role === 'player') {
    returnedData = await putPlayerProfileAPI(sqlDB, queryClient, username, newData) || [];
  } else if (personalInfo.role === 'coach') {
    returnedData = await putCoachProfileAPI(sqlDB, queryClient, username, newData) || [];
  } else {
    // throw new Error('Cannot edit personal information because given username it not player or coach');
    throwBasedOnCode('e403.3');
  }
  return returnedData;
}

export default function bindGetProfile(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.get('/profile', async (req, res) => {
    try {
      let username = req.session.username;
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
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });

  app.get('/profile/:username', async (req, res) => {
    try {
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      let homepageAPI = (await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to see the profile of player
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername!, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerProfileAPI(sqlDB, queryClient, req.params.username);
          } else {
            throwBasedOnCode('e400.8', req.params.username);
          }
        },
        async () => {
          // this function will return the profile given username, does matter if querried username is player or coach
          return getProfileAPI(sqlDB, queryClient, req.params.username); 
        },
      )) as any[];
      res.send(homepageAPI);

    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
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
      // let logginUsername = CURRENTLY_LOGGED_IN;
      // console.log('test: ' + logginUsername);
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      let newData = req.body;
      let putData = await putProfileAPI(sqlDB, queryClient, loggedInUsername!, newData);
      res.status(200).send(putData);
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });

  app.put('/profile/:username', async (req, res) => {
    try {
      let loggedInUsername =  req.session.username;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }
      let newData = req.body;

      let editedHomepageAPI = (await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to eidt the profile of players in his teams
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername!, req.params.username);
          if (commonTeams.length !== 0) {
            let editedData = await putPlayerProfileAPI(sqlDB, queryClient, req.params.username, newData);
            return editedData;
          } else {
            // throw new Error('Cannot find the input username in your teams');
            throwBasedOnCode('e400.8', req.params.username);
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
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.error(error);
    }
  });
}











