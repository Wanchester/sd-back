import { QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';
import { Database } from 'sqlite3';
import { SessionResponseType, TimeSeriesResponse } from './interface';
import { getTeamsAPI } from './team';
import { getTeamPlayersAPI } from './teamPage';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';
import { getTrainingSessionsAPI } from './trainingSession';
import { executeInflux, getPersonalInfoAPI } from './utils';
import { buildQuery, InfluxQuery } from './utilsInflux';


export async function getLineGraphAPI(
  queryClient: QueryApi,
  influxRequest: InfluxQuery,
): Promise<TimeSeriesResponse | undefined> {
  /**
   * TODO:
   */

  //prepare output object skeleton
  //  arrow function will create new arrays, so they are not shared between players
  let generateStatsSkeleton = () => Object.fromEntries(influxRequest.fields!.map((f) => [f, []]));
  let output: TimeSeriesResponse = {};
  
  //frontend may specify a filter for player's names
  //we can construct the playernames section from this
  if (influxRequest.names !== undefined) {
    output = Object.fromEntries(influxRequest.names.map((p) => [p, generateStatsSkeleton()]));
  }

  //perform query
  const influxResponse = await executeInflux(buildQuery(influxRequest), queryClient);

  //organise times and values into output
  influxResponse.forEach((row) => {
    //request may not have specified names, extract from influxResponse
    if (!((row['Player Name'] as string) in output)) {
      output[row['Player Name']] = generateStatsSkeleton();
    }

    output[row['Player Name']][row._field].push([row._time, row._value]);
  });
  return output;
}

export async function buildQueryHasPermissions(
  sqlDB: Database, 
  queryClient: QueryApi,
  username: string,
  requestedQuery: InfluxQuery,
) {
  if ((await getPersonalInfoAPI(sqlDB, username)).role === 'admin') {return true;}
  //error if unknown field
  const legalFieldKeys = ['2dAccuracy', '3dAccuracy', 'Distance', 'Height', 'RunDistance', 'SprintDistance', 'TotalDistance', 'TotalRunDistance', 'TotalSprintDistance', 'TotalWorkRate', 'Velocity', 'WorkRate', 'lat', 'lon'];
  for (let fieldKey of requestedQuery.fields!) {
    if (!legalFieldKeys.includes(fieldKey)) {
      throwBasedOnCode('e400.21', fieldKey, legalFieldKeys);
    }
  }
  /**
   * Permissions restrict which values a user may request to view.
   * Those values are grouped as Player Names, Teams and training Sessions
   */
  const allowedSessionsPromise = getTrainingSessionsAPI(sqlDB, queryClient, username) as Promise<SessionResponseType[] | undefined>;
  const allowedTeamsPromise = getTeamsAPI(sqlDB, queryClient, username) as Promise<string[] | undefined>;
  //allowed player names are derrived from the allowed team names
  const allowedPlayerNamesPromise = Promise.all((await allowedTeamsPromise)!.flatMap((teamName:string)=> 
    getTeamPlayersAPI(sqlDB, queryClient, teamName)));

  /**
   * throw a 403 FORBIDDEN
   */
  const compareRequestedWithAllowed = (requestedList: string[], allowedList: string[] | undefined) => {
    if (allowedList === undefined || allowedList.length === 0) {throwBasedOnCode('e403.4', requestedList[0]);}
    
    const keyedAllowed = Object.fromEntries(allowedList!.map((s) => [s, true]));
    for (let requested of requestedList) {
      if (keyedAllowed[requested] === undefined) {
        throwBasedOnCode('e403.4', requested);
      }
    }
  };

  //perform checks
  //sessions
  if (requestedQuery.sessions !== undefined) {
    const allowedSessions = (await allowedSessionsPromise)!.map((s) => s.sessionName);
    compareRequestedWithAllowed(requestedQuery.sessions, allowedSessions);
  }
  //teams
  if (requestedQuery.teams !== undefined) {
    const allowedTeams = (await allowedTeamsPromise);
    compareRequestedWithAllowed(requestedQuery.teams, allowedTeams);
  }
  //players
  if (requestedQuery.names !== undefined) {
    const allowedPlayerNames = (await allowedPlayerNamesPromise).flat().map((n)=>n.name);
    compareRequestedWithAllowed(requestedQuery.names, allowedPlayerNames);
  }

  //all passed
  return true;
}

export default function bindGetLineGraph(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  /**
   * TODO:
   *  [ ] what if empty return values?
   */
  app.get('/lineGraph', async (req, res) => {
    try {
      //must log in
      if (req.session.username === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

      //no fields specified. Many fields in InfluxDB are irrelevant, will not return all
      if (req.body.fields === undefined || req.body.fields.length === 0) {
        throwBasedOnCode('e400.19', JSON.stringify(req.body) as string);
      }
      //ensure all keys are valid
      const querysKeys = Object.keys(req.body);
      const expectedKeys = ['names', 'fields', 'sessions', 'teams', 'time_window', 'range', 'get_unique'];
      for (let key of querysKeys) {
        if (!(expectedKeys.includes(key))) {
          throwBasedOnCode('e400.21', key, expectedKeys);
        }
      }
           

      const performQuery = async () => {
        const lineGraphData = await getLineGraphAPI(queryClient, req.body as InfluxQuery);
  	    res.status(200).send(lineGraphData);
      };

      if (await buildQueryHasPermissions(sqlDB, queryClient, req.session.username!, req.body) === true) {
        performQuery();
        return;
      }


    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
    }
  });
}
