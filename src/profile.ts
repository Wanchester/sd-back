import { consoleLogger, QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { getCoachTeamsAPI, getPlayerTeamsAPI } from './team';
import { getCoachTrainingSessionsAPI, getTrainingSessionsAPI } from './trainingSession';
import { getPersonalInfoAPI, callBasedOnRole, hasCommonTeams, getCommonTeams, DEFAULT_COACH, CURRENTLY_LOGGED_IN } from './utils';
import { Express } from 'express';
import { isPlainObject } from 'lodash';
import { userEditTable, coachEditTable} from './editTable';
import  *  as DBI from './dbInterfaces';

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
    homepageInfo.trainingSessions = await getCoachTrainingSessionsAPI(sqlDB, queryClient, username);
    // homepageInfo.trainingSessions = ['TODO: to implement await getPlayerSessionsAPI(sqlDB, queryClient, username);'];
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
  let homepageInfo: any[] = [];
  if (personalInfo.role == 'player') {
    homepageInfo = await getPlayerProfileAPI(sqlDB, queryClient, username);
  } else if (personalInfo.role == 'coach') {
    homepageInfo = await getCoachProfileAPI(sqlDB, queryClient, username);
  } else if (personalInfo.role == 'admin') {
    homepageInfo = ['TODO: admin profile, to be implemented'];
  }
  return homepageInfo;
}

export async function putPlayerProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role !== 'player') {
    throw new Error('cannot find aplayer with given username');
  }

  if (isPlainObject(newData)) {
    // update keys that exist in the object
    let editable:string[] = [ 'email', 'dob', 'nationality', 'height', 'weight'];
    for (let key in newData) { // loop through all the keys provided by the frontend
      if (editable.includes(key)) { // if the provided key is editable
        // update the new value
        userEditTable(key as DBI.UserTableKey, newData[key], username);
      } else {
        throw new Error(`You are not allowed to edit the ${key} field`);
      }
    }
    return newData;
  } else {
    throw new Error('PUT request expects a valid object.');
  }
}

export async function putCoachProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  if (personalInfo.role !== 'coach') {
    throw new Error('cannot find a coach with given username');
  }

  if (isPlainObject(newData)) {
    // update keys that exist in the object
    let editable:string[] = [ 'email', 'dob', 'nationality', 'height', 'weight'];
    for (let key in newData) { // loop through all the keys provided by the frontend
      if (editable.includes(key)) { // if the provided key is editable
        // update the new value
        userEditTable(key as DBI.UserTableKey, newData[key], username);
      } else {
        throw new Error(`You are not allowed to edit the ${key} field`);
      }
    }
    return newData;
  } else {
    throw new Error('PUT request expects a valid object.');
  }
}

export async function putProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string, newData: any[]) {
  let personalInfo = await getPersonalInfoAPI(sqlDB, username);
  let returnedData: any[] = [];
  if (personalInfo.role === 'player') {
    returnedData = await putPlayerProfileAPI(sqlDB, queryClient, username, newData);
  } else if (personalInfo.role === 'coach') {
    returnedData = await putCoachProfileAPI(sqlDB, queryClient, username, newData);
  } else {
    throw new Error('Cannot edit personal information because given username it not player or coach');
  }
  return returnedData;
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
      let username = CURRENTLY_LOGGED_IN;

      let homepageAPI = await getProfileAPI(sqlDB, queryClient, username);
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
      // let loggedInUsername = 'p_jbk';
      // let loggedInUsername = 'c_coach1';
      // let loggedInUsername = 'a_administrator';
      let loggedInUsername = CURRENTLY_LOGGED_IN;
      // let username = req.params.username;
      // let homepageAPI = await getProfileAPI(db, queryClient, username);
      let homepageAPI = (await callBasedOnRole(
        sqlDB,
        loggedInUsername!,
        async () => {
          throw new Error('You are not allowed to make the request');
        },
        async () => {
          // the coach should only be able to see the profile of player
          // TODO: validate if the queried players is a member of that coach. 
          // return getPlayerProfileAPI(db, queryClient, req.params.username);
          // currently, the coach can see the profile of all players for testing purpose
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerProfileAPI(sqlDB, queryClient, req.params.username);
          } else {
            throw new Error('Cannot find the input username in your teams');
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
      let newData = req.body;
      let putData = await putProfileAPI(sqlDB, queryClient, logginUsername, newData);
      res.send(putData);
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
          throw new Error('You are not allowed to make the request');
        },
        async () => {
          // the coach should only be able to eidt the profile of players in his teams
          let commonTeams = await getCommonTeams( sqlDB, queryClient, loggedInUsername, req.params.username);
          if (commonTeams.length !== 0) {
            let editedData = await putPlayerProfileAPI(sqlDB, queryClient, req.params.username, newData);
            return editedData;
          } else {
            throw new Error('Cannot find the input username in your teams');
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











