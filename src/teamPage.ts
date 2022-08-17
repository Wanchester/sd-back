import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { Express } from 'express';
import * as DBI from './utilsInflux';
import { executeInflux, SQLretrieve } from './utils';
import throwBasedOnCode from './throws';


async function getTeamPlayersAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  teamName: string,
): Promise<{ name: string; username: string; }[]> {
  const query = DBI.buildQuery({ teams: [teamName], get_unique: 'player' });
  const influxResponse = executeInflux(query, queryClient);
  let output = [];

  //push real names from Influx into array
  let namesFromInflux: string[] = [];
  await influxResponse.then(list => 
    list.forEach(row => 
      namesFromInflux.push(row['Player Name']),
    ),
  rejectedReason => {
    //influx problem
    throwBasedOnCode('e500.0', rejectedReason);
  });
    
  //use names from influx to query SQL, as player team is not in SQL 17/08/22
  for (let playerName of namesFromInflux) {  
    let queryResult = await SQLretrieve(sqlDB, 
      'SELECT username FROM USER WHERE NAME = ? AND ROLE = "player"', [playerName]);
    
    //if queryResult not empty object
    if (Object.keys(queryResult).length !== 0) {
      const username:string = queryResult[0].username;
      let pair = { 'name': playerName, 'username': username };
      output.push(pair);
    } else {
      //sql returned empty object (possible?)
      throwBasedOnCode('e500.1', `Unable to find username for player: ${playerName}.
        SQL returned empty object.`);
    }
  }
  
  return output;
}

export function bindGetTeamPlayers(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.get('/team', async (req, res) => {
    //todo ROLE MANAGEMENT
    const teamName = req.query.teamName as string;
    const players = await getTeamPlayersAPI(sqlDB, queryClient, teamName);
    //todo: what if no players returned ???
    res.send({ 'players': players });
  });
}
