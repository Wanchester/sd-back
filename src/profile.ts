import { QueryApi } from "@influxdata/influxdb-client";
import { Database } from "sqlite3";
import { getJoinedTeamAPI } from "./team";
import { getTrainingSessionAPI } from "./trainingSession";
import { getPersonalInfoAPI, callBasedOnRole } from "./utils";

export async function getProfileAPI(sqlDB: Database, queryClient: QueryApi, username: string) {
    //search the personal information of given username from SQL database
    const personalInfo = await getPersonalInfoAPI(sqlDB, username);
    if ('error' in personalInfo[0]) {
      return personalInfo;
    }
    let playerName = personalInfo[0].name;
    //get the teams that given players has joined in
    const teams = await getJoinedTeamAPI(sqlDB, queryClient, username);
    //get the information of all the training sessions of given players
    const trainingSession = await getTrainingSessionAPI(sqlDB, queryClient, username);
    //define the structure of the API that will be returned to frontend
    const homepageInfo = {
      'username':'',
      'name': '',
      'email': '',
      'dob': '',
      'nationality':'',
      'height':0,
      'weight':0,
      'role':'',
      'team':[''],
      'trainingSession':[{}],
    };
    homepageInfo.username = username;
    homepageInfo.name = playerName;
    homepageInfo.email = personalInfo[0].email;
    homepageInfo.dob = personalInfo[0].dob;
    homepageInfo.nationality = personalInfo[0].nationality;
    homepageInfo.height = personalInfo[0].height;
    homepageInfo.weight = personalInfo[0].weight;
    homepageInfo.role = personalInfo[0].role;
    homepageInfo.team = teams;
  
    await callBasedOnRole(sqlDB, username, () => {
      homepageInfo.trainingSession = trainingSession;
    });
    return homepageInfo;
  }
  