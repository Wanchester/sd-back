import { QueryApi } from "@influxdata/influxdb-client";
import { Database } from "sqlite3";
import { Express } from 'express';
import * as DBI from './utilsInflux';
import { executeInflux } from "./utils";

export function bindGetTeamPlayers(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
	app.get('/teamPlayers', async (req, res) => {
		const players = getTeamPlayersAPI(sqlDB, queryClient, teamName);
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