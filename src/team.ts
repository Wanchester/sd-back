import * as DBI from './utilsInflux';
import { readFileSync } from 'fs';
import { Database } from 'sqlite3';
import interpole from 'string-interpolation-js';
import {
  getPersonalInfoAPI,
  executeInflux,
  callBasedOnRole,
  getCommonTeams,
  CURRENTLY_LOGGED_IN,
} from './utils';
import { resolve as pathResolve } from 'path';
import { QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';
import throwBasedOnCode, { generateErrorBasedOnCode } from './throws';

export async function getPlayerTeamsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  const role = personalInfo.role; 
  if (role === 'player') {
    const PLAYER = personalInfo.name;
    //get the teams that the given player joined in
    let queryPlayerTeam = readFileSync(
      pathResolve(__dirname, '../../queries/players_teams.flux'),
      { encoding: 'utf8' },
    );
    queryPlayerTeam = interpole(queryPlayerTeam, [PLAYER]);
    // queryPlayerTeam = 'test exception';
    const teams = await executeInflux(queryPlayerTeam, queryClient);
    const cleanedTeams: string[] = [];

    for (let i = 0; i < teams.length; i++) {
      cleanedTeams.push(teams[i]._measurement);
    }
    return cleanedTeams;
  } else {
    // 'e404.0': 'Cannot find a player with given username :0',
    throwBasedOnCode('e404.0', username);
  }
}

export async function getCoachTeamsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  const role = personalInfo.role; 
  if (role == 'coach') {
    const queryPlayerTeam = 'select teamName from TeamCoach where username = ?';
    // const queryPlayerTeam = 'test exception';
    const teams = await new Promise<any>((resolve, reject) => {
      db.all(queryPlayerTeam, [username], function (err, row) {
        // process the row here 
        if (err) {
          reject(generateErrorBasedOnCode('e500.1', err));
        } else {
          resolve(row);
        }
      });
    });

    const cleanedTeams: string[] = [];
    for (let i = 0; i < teams.length; i++) {
      cleanedTeams.push(teams[i].teamName);
    }
    return cleanedTeams;

  } else {
    // 'e404.1': 'Cannot find a coach with given username',
    throwBasedOnCode('e404.1', username);
  }
}

export async function getTeamsAPI(
  db: Database,
  queryClient: QueryApi,
  username: string,
) {
  //search the personal information of given username from SQL database
  const personalInfo = await getPersonalInfoAPI(db, username);
  if ('error' in personalInfo) {
    return personalInfo;
  }
  const role = personalInfo.role; 
  let cleanedTeams: string[] = [];
  if (role == 'player') {
    cleanedTeams = await getPlayerTeamsAPI(db, queryClient, username);
  } else if (role == 'coach') {
    cleanedTeams = await getCoachTeamsAPI(db, queryClient, username);
  }
  return cleanedTeams;
}

//API return points
export default function bindGetTeams(
  app: Express,
  db: Database,
  queryClient: QueryApi,
) {
  app.get('/teams', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = sess.username;
      let username = CURRENTLY_LOGGED_IN;

      let teamsAPI = await getTeamsAPI(db, queryClient, username);
      res.send(teamsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });

  app.get('/teams/:username', async (req, res) => {
    try {
      // const sess = req.session;
      // let username = 'p_warren';
      let loggedInUsername = CURRENTLY_LOGGED_IN; // username will be set to the username from session variable when log in feature is implemented
      //right now, just let the username = 'a_administrator' so that it has the right to see the teams list of all players.
       
      let teamsAPI = (await callBasedOnRole(
        db,
        loggedInUsername!,
        async () => {
          // 'e401.1': 'You have to be a coach/admin to make this request.',
          throwBasedOnCode('e401.1');
        },
        async () => {
          // the coach should only be able to see the teams of player
          // return getPlayerTeamsAPI(db, queryClient, req.params.username);
          let commonTeams = await getCommonTeams( db, queryClient, loggedInUsername, req.params.username);
          if (commonTeams.length !== 0) {
            return getPlayerTeamsAPI(db, queryClient, req.params.username);
          } else {
            // 'Cannot find the input username :0 in your teams'
            throwBasedOnCode('e404.4', req.params.username);
          }
        },
        async () => {
          return getTeamsAPI(db, queryClient, req.params.username);
        },
      )) as any[];
      res.send(teamsAPI);
    } catch (error) {
      res.send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
      console.log((error as Error).stack);
    }
  });
}

export function bindGetTeamPlayers(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
	app.get('/team/players', async (req, res) => {
		const players = getTeamPlayersAPI(sqlDB, queryClient, req.params.teamName);
		res.send(players);
	});
}

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
			namesFromInflux.push(row['Player Name'])
		));
	
	
	
	console.log(namesFromInflux);
}