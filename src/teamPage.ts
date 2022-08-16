import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { Express } from 'express';
import * as DBI from './utilsInflux';
import { executeInflux, SQLretrieve } from './utils';


async function getTeamPlayersAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  teamName: string,
) {
  const query = DBI.buildQuery({ teams: [teamName], get_unique: 'player' });
  const response = executeInflux(query, queryClient);

  //push names into array
  let namesFromInflux: string[] = [];
  await response.then(list => 
    list.forEach(row => 
      namesFromInflux.push(row['Player Name']),
    ));
    
  let output = [];
  for (let playerName of namesFromInflux) {  
    let queryResult = await SQLretrieve(sqlDB, 'SELECT username FROM USER WHERE NAME = ?', [playerName]);
    
    //todo: case: name not returned
    // if (Object.keys(queryResult).length === 0) {return [];};
    let username = queryResult[0].username;

    let pair = { 'name': playerName, 'usename': username };
    output.push(pair);
  }
  //todo output not empty {'username': []}
  return output;
}

export function bindGetTeamPlayers(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.get('/team', async (req, res) => {
    const teamName = req.query.teamName as string;
    const players = await getTeamPlayersAPI(sqlDB, queryClient, teamName);
    res.send({ 'players': players });
  });
}
