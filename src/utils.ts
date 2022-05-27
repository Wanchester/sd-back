import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';

export const DEFAULT_USERNAME = 'warren';

//function to retrieve information from SQL database
export const SQLretrieve = async ( sqlDB: Database, query: any, params: any[] = []) => {
  let data : any[] = []; 
  await new Promise<void>((resolve) => {
    sqlDB.serialize(function () {
      let statement = sqlDB.prepare(query);
      statement.each(params, function (err: any, row:any) {
        data.push(row); //pushing rows into array
      }, 
      function () { // calling function when all rows have been pulled
        resolve();
      });
    });
  });
  return data;
};

//function to run the InfluxDB query
export const executeInflux = async (fluxQuery: string, influxClient: QueryApi) => {
  let sessionArray : any[] = []; 
  await new Promise<void>((resolve, reject) => {
    let rejected = false;
    influxClient.queryRows(fluxQuery, {
      next: (row, tableMeta) => {
        const tableObject = tableMeta.toObject(row);
        sessionArray.push(tableObject);
      },
      error: (error) => {
        rejected = true;
        error.message = 'e5001: Error when querying InfluxDB';
        reject(error);
      },
      complete: () => {
        console.log('\nQuery Successfully');
        if (!rejected) {
          resolve();
        }
      },
    });
  });
  return sessionArray;
};

//role management
export async function callBasedOnRole <P extends Array<unknown> = never[]>(
  sqlDB: Database,
  username: string,
  ifPlayer: ((...args: P) => void) | null = null,
  ifCoach: ((...args: P) => void) | null = null,
  ifAdmin: ((...args: P) => void) | null = null,
  paramList: P | null = null,
): Promise<void> {
  //search the player in the SQL and get the role of that username
  /*
  let role = '';
  const query = 'select * from user where username = ?';
  let playerInfo = await SQLretrieve( sqlDB, query, [username]);

  if (playerInfo.length == 0) {
    throw new Error('e4041: Given username is not found');
  } else {
    role = playerInfo[0].role;
  }
  */
  const playerInfo = await getPersonalInfoAPI(sqlDB, username);
  const role = playerInfo[0].role;
  //return playerInfo;
  switch (role) {
    case 'Player':
      ifPlayer?.apply(null, paramList!);
      return;
    case 'coach':
      ifCoach?.apply(null, paramList!);
      return;
    case 'admin':
      ifAdmin?.apply(null, paramList!);
      return;
  }
}

export async function getPersonalInfoAPI(sqlDB: Database, username: string) {
  //search the player in the SQL
  const query = 'select * from user where username = ?';
  let paramsLst = [username];
  let playerInfo = await SQLretrieve(sqlDB, query, paramsLst);

  if (playerInfo.length == 0) {
    throw new Error('e4041: Given username is not found');
  }
  return playerInfo;
}
