import { QueryApi } from '@influxdata/influxdb-client';
import { Database } from 'sqlite3';
import { Express } from 'express';
import * as DBI from './utilsInflux';
import { callBasedOnRole, executeInflux, SQLretrieve } from './utils';
import  throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';
import { getTeamsAPI } from './team';


export async function getTeamPlayersAPI(
  sqlDB: Database,
  queryClient: QueryApi,
  teamName: string,
): Promise<{ name: string; username: string; }[]> {
  const query = DBI.buildQuery({ teams: [teamName], get_unique: 'players' });
  const influxResponse = executeInflux(query, queryClient);
  let output: { name: string, username: string }[] = [];

  //push real names from Influx into array
  let namesFromInflux: string[] = [];
  await influxResponse.then(list => 
    list.forEach(row => 
      namesFromInflux.push(row['Player Name']),
    ),
  rejectedReason => {
    //influx problem
    throwBasedOnCode('e500.0', rejectedReason, 
      '\nThis error shouldn\'t happen. teamPage.ts:33');
  });
    
  //use names from influx to query SQL, as player team is not in SQL 17/08/22
  for (let playerName of namesFromInflux) {  
    let queryResult = await SQLretrieve(sqlDB, 
      'SELECT username FROM USER WHERE NAME = ? AND ROLE = "player" LIMIT 1', [playerName]);
    
    //if queryResult not empty object
    if (Object.keys(queryResult).length !== 0) {
      const username: string = queryResult[0].username;
      let pair = { 'name': playerName, 'username': username };
      output.push(pair);
    } else {
      //sql returned empty object (possible?)
      throwBasedOnCode('e500.1', `Unable to find username for player: ${playerName}.
        SQL returned empty object.`);
    }
  }
  //possibly empty array
  return output;
}

export function bindGetTeamPlayers(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.get('/team', async (req, res) => {
    try {
      const teamName = req.query.teamName as string;
    
      /**
     * Calls the api with the requested team name
     * and sends to the frontend without role management
     */
      const performRequest = async () => {
        const players = await getTeamPlayersAPI(sqlDB, queryClient, teamName);
        if (players.length === 0) {
          res.status(400).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e400.13', teamName).message,
          });
          return;
        } 
        res.status(200).send({ 'players': players });
      };
    
      //ROLE MANAGEMENT
      //not logged in
      const loggedInUsername = req.session.username as string;
      if (loggedInUsername === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      /** 
     * query the right database depending on player or coach.
     * permission depends on whether user is in requested team
    */
      const performRequestWithPermissionOrError = async () => {
        const associatedTeams = await getTeamsAPI(sqlDB, queryClient, loggedInUsername);
        if (associatedTeams.includes(teamName)) {
          performRequest();
        } else {
        //player/coach is not in this team
          res.status(400).send({
            name: 'Error',
            error: generateErrorBasedOnCode('e400.12', loggedInUsername, teamName).message,
          });
          return;
        }
      };

      callBasedOnRole(sqlDB, loggedInUsername, 
      //player
        performRequestWithPermissionOrError,
        //coach
        performRequestWithPermissionOrError,
        //admin
        performRequest,
      );
    } catch (e) {
      res.status(getStatusCodeBasedOnError(e as Error)).send({
        name: (e as Error).name,
        error: (e as Error).message,
      });
    }
  });
}
