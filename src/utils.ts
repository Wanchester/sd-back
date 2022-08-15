import { QueryApi } from '@influxdata/influxdb-client';

import { Database } from 'sqlite3';
import { getCoachTeamsAPI, getPlayerTeamsAPI } from './team';
import throwBasedOnCode from './throws';

export const DEFAULT_PLAYER = 'p_warren';
export const DEFAULT_COACH = 'c_coach1';
export const DEFAULT_ADMIN = 'a_administrator';

export const CURRENTLY_LOGGED_IN = DEFAULT_ADMIN;

//function to run the SQL query
export const SQLretrieve = async (
  sqlDB: Database,
  query: string,
  params: any[] = [],
) => {
  let data: any[] = [];
  await new Promise<void>((resolve, reject) => {
    sqlDB.serialize(function () {
      let statement = sqlDB.prepare(
        query,
        // this callback is used for error handling in SQL querry
        function (err: any) {
          if (err) { reject(err); }
        },
      );
      statement.each(
        params,
        function (err: any, row: any) {
          if (err) {
            reject(err);
          } else {
            data.push(row); //pushing rows into array
          }
        },
        function () {
          // calling function when all rows have been pulled
          resolve();
        },
      );
    });
  });
  return data;
};

export async function getPersonalInfoAPI(sqlDB: Database, username: string) {
  //search the player in the SQL
  const query = 'select * from user where username = ?';
  let paramsLst = [username];
  let playerInfo = await SQLretrieve(sqlDB, query, paramsLst);

  if (playerInfo.length == 0) {
    // throw new Error('e400.4: Given username is not found');
    throwBasedOnCode('e400.4', username);
  }
  return playerInfo[0];
}

//function to run the InfluxDB query
export const executeInflux = async (
  fluxQuery: string,
  influxClient: QueryApi,
) => {
  let resultArray: any[] = [];
  await new Promise<void>((resolve, reject) => {
    let rejected = false;
    influxClient.queryRows(fluxQuery, {
      next: (row, tableMeta) => {
        const tableObject = tableMeta.toObject(row);
        resultArray.push(tableObject);
      },
      error: (error) => {
        rejected = true;
        error.message = 'e5001: Error when querying InfluxDB';
        reject(error);
      },
      complete: () => {
        // console.log('\nQuery Successfully InfluxDB');
        if (!rejected) {
          resolve();
        }
      },
    });
  });
  return resultArray;
};

//role management
export async function callBasedOnRole<
  P extends Array<unknown> = never[],
  IfP = void,
  IfC = void,
  IfA = void,
>(
  sqlDB: Database,
  username: string,
  ifPlayer: ((...args: P) => IfP | Promise<IfP>) | null = null,
  ifCoach: ((...args: P) => IfC | Promise<IfC>) | null = null,
  ifAdmin: ((...args: P) => IfA | Promise<IfA>) | null = null,
  paramList: P | null = null,
): Promise<IfP | IfC | IfA | undefined> {
  const playerInfo = await getPersonalInfoAPI(sqlDB, username);
  const role = playerInfo.role;

  switch (role) {
    case 'player':
      return ifPlayer?.apply(null, paramList!);
    case 'coach':
      return ifCoach?.apply(null, paramList!);
    case 'admin':
      return ifAdmin?.apply(null, paramList!);
  }
}

export async function hasCommonTeams( sqlDB:Database, queryClient: QueryApi, username1: string, username2: string): Promise<boolean> {
  let personalInfo1 = await getPersonalInfoAPI(sqlDB, username1);
  let personalInfo2 = await getPersonalInfoAPI(sqlDB, username2);
  
  let teams1: string[] = [];
  if (personalInfo1.role == 'player') {
    console.log('1st username is player');
    teams1 = await getPlayerTeamsAPI(sqlDB, queryClient, username1 );
  } else if (personalInfo1.role == 'coach') {
    console.log('1st username is coach');
    teams1 = await getCoachTeamsAPI(sqlDB, queryClient, username1 );
  } else {
    throw new Error('the 1st input username is not a player or a coach');
  }
  
  let teams2: string[] = [];
  if (personalInfo2.role == 'player') {
    console.log('2nd username is player');
    teams2 = await getPlayerTeamsAPI(sqlDB, queryClient, username2 );
  } else if (personalInfo2.role == 'coach') {
    console.log('2nd username is coach');
    teams2 = await getCoachTeamsAPI(sqlDB, queryClient, username2 );
  } else {
    throw new Error('the 2nd input username is not a player or a coach');
  }
  
  let commonTeams = teams1.filter(value => teams2.includes(value));
  console.log(commonTeams);
  if (commonTeams.length !== 0) {
    return true;
  } else {
    return false;
  }
}

export async function getCommonTeams(sqlDB:Database, queryClient: QueryApi, username1: string, username2: string): Promise<string[]> {
  let personalInfo1 = await getPersonalInfoAPI(sqlDB, username1);
  let personalInfo2 = await getPersonalInfoAPI(sqlDB, username2);
  
  let teams1: string[] = [];
  if (personalInfo1.role == 'player') {
    teams1 = await getPlayerTeamsAPI(sqlDB, queryClient, username1 );
  } else if (personalInfo1.role == 'coach') {
    teams1 = await getCoachTeamsAPI(sqlDB, queryClient, username1 );
  } else {
    throw new Error('the input username is not a player or a coach');
  }
  
  let teams2: string[] = [];
  if (personalInfo2.role == 'player') {
    teams2 = await getPlayerTeamsAPI(sqlDB, queryClient, username2 );
  } else if (personalInfo2.role == 'coach') {
    teams2 = await getCoachTeamsAPI(sqlDB, queryClient, username2 );
  } else {
    throw new Error('the input username is not a player or a coach');
  }
  
  let commonTeams = teams1.filter(value => teams2.includes(value));
  return commonTeams;
}