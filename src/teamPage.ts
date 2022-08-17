import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { Express } from 'express';
import * as DBI from './utilsInflux';
import { callBasedOnRole, executeInflux, SQLretrieve } from './utils';
import { generateErrorBasedOnCode } from './throws';
import { getPlayerTeamsAPI, getCoachTeamsAPI } from './team';


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
    console.log('src/teamPage.ts:28. This influx error might never happen');
    return generateErrorBasedOnCode('e500.0', rejectedReason).message;
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
      generateErrorBasedOnCode('e500.1', `Unable to find username for player: ${playerName}.
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
    
    const teamName = req.query.teamName as string;
    const performRequest = async () => {
      const players = await getTeamPlayersAPI(sqlDB, queryClient, teamName);
      //todo: what if no players returned ???
      res.send({ 'players': players });
    };
    
    //ROLE MANAGEMENT
    const loggedInUsername = req.session.username as string;
    if (loggedInUsername === undefined) {
      res.status(401).send({
        name: 'Error',
        error: generateErrorBasedOnCode('e401.0').message,
      });
      return;
    }
    callBasedOnRole(sqlDB, loggedInUsername, 
      //player
      async () => {
        const associatedTeams = await getPlayerTeamsAPI(sqlDB, queryClient, loggedInUsername);
        if (associatedTeams.includes(teamName)) {
          await performRequest();
          return;
        } else {
          //player is not in this team
          res.status(400).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e400.12', loggedInUsername, teamName).message,
          });
          return;
        }
      },
      //coach
      async () => {
        const associatedTeams = await getCoachTeamsAPI(sqlDB, queryClient, loggedInUsername);
        if (associatedTeams.includes(teamName)) {
          await performRequest();
          return;
        } else {
          //coach is not in this team
          res.status(400).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e400.12', loggedInUsername, teamName).message,
          });
          return;
        }
      },
      //admin
      async () => { await performRequest(); },
    );
  });
}
