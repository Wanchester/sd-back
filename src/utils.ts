import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';

export const DEFAULT_USERNAME = 'warren';

//function to retrieve information from SQL database
export const SQLretrieve = async (
  sqlDB: Database,
  query: string,
  params: any[] = [],
) => {
  let data: any[] = [];
  await new Promise<void>((resolve) => {
    sqlDB.serialize(function () {
      let statement = sqlDB.prepare(query);
      statement.each(
        params,
        function (err: any, row: any) {
          data.push(row); //pushing rows into array
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
    throw new Error('e4041: Given username is not found');
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
        console.log('\nQuery Successfully');
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
