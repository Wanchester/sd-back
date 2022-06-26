import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { getTeamsAPI } from './team';
import { getTrainingSessionsAPI } from './trainingSession';
import { getPersonalInfoAPI, callBasedOnRole, DEFAULT_USERNAME } from './utils';
import { Express } from 'express';

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
  //get the teams that given players has joined in
  const teams = await getTeamsAPI(sqlDB, queryClient, username);
  //get the information of all the training sessions of given players
  const trainingSession = await getTrainingSessionsAPI(
    sqlDB,
    queryClient,
    username,
  );
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
    team: [''],
    trainingSession: [{}],
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
    () => {
      homepageInfo.team = teams;
      homepageInfo.trainingSession = trainingSession;
    }, 
    () => { 
      homepageInfo.team = ['this is a coach'];
      homepageInfo.trainingSession = ['this is a coach'];
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
      let username = req.params.username;
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
}
