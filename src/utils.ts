import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';

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
        //db.close(); //closing connection
        resolve();
      });
    });
  });
  return data;
};

//function to run the InfluxDB querry
export const executeInflux = async (fluxQuery: string, influxClient: QueryApi) => {
  let sessionArray : any[] = []; 

  await new Promise<void>((resolve, reject) => {
    let rejected = false;
    influxClient.queryRows(fluxQuery, {
      next: (row, tableMeta) => {
        const tableObject = tableMeta.toObject(row);
        sessionArray.push(tableObject);
      },
      error: (my_error) => {
        rejected = true;
        reject(my_error);
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
