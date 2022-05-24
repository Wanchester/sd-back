import { readFileSync } from "fs";
import { Database } from "sqlite3";
import interpole from "string-interpolation-js";
import { getPersonalInfoAPI, executeInflux } from "./utils";
import { resolve as pathResolve } from 'path';
import { QueryApi } from "@influxdata/influxdb-client";


export async function getJoinedTeamAPI(db: Database, queryClient: QueryApi, username: string ) {
    //search the personal information of given username from SQL database
    const personalInfo = await getPersonalInfoAPI( db, username);
    if ('error' in personalInfo[0]) {
        return personalInfo;
    }
    let PLAYER = personalInfo[0].name;
    //get the teams that the given player joined in
    let queryPlayerTeam = readFileSync(pathResolve(__dirname, '../../queries/players_teams.flux'), { encoding: 'utf8' });
    queryPlayerTeam = interpole(queryPlayerTeam, [PLAYER]);   
    const teams =  await executeInflux(queryPlayerTeam, queryClient);
    const cleanedTeams:string[] = [];
  
    for (let i = 0; i < teams.length; i++ ) {
        cleanedTeams.push(teams[i]._measurement);
    }
    return cleanedTeams;
}

