import { QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';
import { Database } from 'sqlite3';
import { CombinationGraphResponse, SessionResponseType, TimeSeriesResponse } from './interface';
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
  //prepare output object skeleton
  //  arrow function will create new arrays, so they are not shared between players
  const generateStatsSkeleton = () => Object.fromEntries(influxRequest.fields!.map((f) => [f, []]));
  let output: TimeSeriesResponse = {};
  
  //frontend may specify a filter for player's names
  //we can construct the playernames section from this
  if (influxRequest.names !== undefined) {
    output = Object.fromEntries(influxRequest.names.map((p) => [p, generateStatsSkeleton()]));
  }

  //ALWAYS aggregate player's data seperately
  if (influxRequest.aggregate !== undefined ) {
    if (influxRequest.aggregate.dont_mix === undefined) {
      influxRequest.aggregate.dont_mix = ['players'];
    } else if (!influxRequest.aggregate.dont_mix.includes('players')) {
      influxRequest.aggregate.dont_mix.push('players');
    }
  }
  //perform query
  const influxResponse = await executeInflux(buildQuery(influxRequest), queryClient);

  //get player names for a given session based on session team
  //assume session has one team
  //@refactor: getSessionPlayersAPI
  //@refactor: getSessionTeamAPI  ??
  let sessionPlayersPromise = undefined;
  if (influxRequest.sessions === undefined) {
    //no sessions specified. allowed teams will be inserted by buildQueryWithPermissions or undefined -> all allowed players returned
    sessionPlayersPromise = executeInflux(buildQuery({ teams: influxRequest.teams || undefined, get_unique: 'players' }), queryClient);
    // console.log(buildQuery({ teams: influxRequest.teams || undefined, get_unique: 'players' }));
  } else {
    //for each specified session, get unique players
    sessionPlayersPromise = executeInflux(buildQuery({ sessions: influxRequest.sessions, get_unique: 'players' }), queryClient);
    // console.log(buildQuery({ teams: influxRequest.teams || undefined, get_unique: 'players' }));
  }
  //organise times and values into output
  influxResponse.forEach((row) => {
    //request may not have specified names, extract from influxResponse
    if (output[row['Player Name']] === undefined) {
      output[row['Player Name']] = generateStatsSkeleton();
    }
    
    if (row['Player Name'] == undefined) {console.log(row); }

    output[row['Player Name']][row._field].push([row._time || 'null', row._value]);
  });

  //if no names requested
  //input the session player names if not yet included
  if (influxRequest.names === undefined) {
    const sessionPlayersResponse = await sessionPlayersPromise;
    const sessionPlayers = sessionPlayersResponse.map((r) => r['Player Name']);
    sessionPlayers.forEach((player) => {
      if (!(player in output)) {
        output[player] = generateStatsSkeleton();
      }
    });
  }
  //sort data
  Object.keys(output).forEach((player:string) => {
    Object.keys(output[player]).forEach((field:string) => {
      output[player][field].sort((f, s) => s[0] < f[0] ? 1 : -1);
    });
  });



  return output;
}

export async function buildQueryWithPermissions(
  sqlDB: Database, 
  queryClient: QueryApi,
  username: string,
  requestedQuery: InfluxQuery,
) {
  if ((await getPersonalInfoAPI(sqlDB, username)).role === 'admin') {return requestedQuery;}
  let output = requestedQuery;
  //error if unknown field
  const legalFieldKeys = ['2dAccuracy', '3dAccuracy', 'Distance', 'Height', 'Run Distance', 'Sprint Distance', 'Total Distance', 'Total Run Distance', 'Total Sprint Distance', 'Total Work Rate', 'Velocity', 'Work Rate', 'lat', 'lon'];
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
  } else {
    //add legal names if none requested
    //ensures no illegal players are returned when not specified
    const allowedTeams = await allowedTeamsPromise;
    output = { ...output, teams: allowedTeams };
  }

  //players
  if (requestedQuery.names !== undefined) {
    const allowedPlayerNames = (await allowedPlayerNamesPromise).flat().map((n)=>n.name);
    compareRequestedWithAllowed(requestedQuery.names, allowedPlayerNames);
  }
  //all passed
  return output;
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
  app.post('/lineGraph', async (req, res) => {
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
      const expectedKeys = ['names', 'fields', 'sessions', 'teams', 'aggregate', 'range', 'get_unique'];
      for (let key of querysKeys) {
        if (!(expectedKeys.includes(key))) {
          throwBasedOnCode('e400.21', key, expectedKeys);
        }
      }
           

      const performQuery = async (q:InfluxQuery) => {
        try {
          const lineGraphData = await getLineGraphAPI(queryClient, q);
          res.status(200).send(lineGraphData);
        } catch (error) {
          const errCode = getStatusCodeBasedOnError(error as Error);
          res.status(errCode).send({
            error: (error as Error).message,
            name: (error as Error).name,
          });
        }
      };

      performQuery(await buildQueryWithPermissions(sqlDB, queryClient, req.session.username!, req.body));

    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
    }
  });
}


export async function getCombinationGraphAPI(
  queryClient: QueryApi,
  influxRequest: InfluxQuery,
): Promise<CombinationGraphResponse | undefined> {
  
  const generateStatsSkeleton = () => Object.fromEntries(influxRequest.fields!.map((f) => [f, []]));
  const output: CombinationGraphResponse = {
    bar: generateStatsSkeleton(),
    line: generateStatsSkeleton(),
  };

  //get average for each session
  const barQuery:InfluxQuery = {
    ...influxRequest, 
    range: { start: '-28d' }, 
    aggregate: { 
      every: 86400, //ensure _time column will be preserved
      func: influxRequest.aggregate?.func || 'mean', 
      dont_mix:['sessions'], 
    },
  };
  const barPromise = executeInflux(buildQuery(barQuery), queryClient);

  // get timedmovingaverage for each session
  const lineQuery: InfluxQuery = {
    ...influxRequest,
    range: { start: '-28d' }, 
    aggregate: {
      func: influxRequest.aggregate?.func || 'timedMovingAverage',
      every: 86400, //1 day
      period: 86400 * 28, //28 days
    },
  };
  const linePromise = executeInflux(buildQuery(lineQuery), queryClient);

  const translateDay = (date:string, n:number) => {
    //some dates represent the previous 24hrs
    const d = new Date(date).getTime();
    return new Date(d + (n * 86400_000)).toISOString();
  };

  //format output.bar...
  const barResponse = await barPromise;
  barResponse.forEach((row)=> {
    output.bar[row._field].push([translateDay(row._time, -1), row._value, row.Session]);
  });


  //insert values from influx
  const lineResponse = await linePromise;
  lineResponse.forEach((row)=> {
    const targetArr = output.line[row._field];
    if (!(targetArr.length >= 1 && targetArr[targetArr.length - 1][0] === translateDay(row._time, -1))) {
      output.line[row._field].push([translateDay(row._time, -1), row._value]);
    }
  });

  //add zero values to the bar graph. easy to work with
  influxRequest.fields!.forEach(field => {
    const barByDate = Object.fromEntries(output.bar[field].map(e => [e[0], [e[1], e[2]]]));
    output.line[field].forEach(linePoint => {
      if (barByDate[linePoint[0]] === undefined) {
        output.bar[field].push([linePoint[0], 0, '']);//empty string for space reasons
      }
    });
    //sort bar
    output.bar[field].sort((f, s) => f[0] < s[0] ? -1 : 1);
  });


  //sort line
  Object.keys(output.line).forEach((field) => {
    output.line[field].sort((f, s) => s[0] < f[0] ? 1 : -1);
  });
  return output;
}



export function bindGetCombinationGraph(
  app: Express,
  sqlDB: Database,
  queryClient: QueryApi,
) {
  app.post('/combinationGraph', async (req, res) => {
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
      const expectedKeys = ['names', 'fields', 'sessions', 'teams', 'aggregate', 'range', 'get_unique'];
      for (let key of querysKeys) {
        if (!(expectedKeys.includes(key))) {
          throwBasedOnCode('e400.21', key, expectedKeys);
        }
      }

      //permissions
      const loggedInUser = await getPersonalInfoAPI(sqlDB, req.session.username);
      if (loggedInUser.role === 'player') {
        if (req.body.names === undefined && req.body.teams === undefined) {
          //default to logged in player, if player
          req.body.names = [loggedInUser.name];
        } else if (req.body.names !== undefined) {
          if (req.body.names.length === 1) {
            //player can only query themselves
            if (req.body.names[0] !== loggedInUser.name) {
              throwBasedOnCode('e403.4', req.body.names[0]);
            } 
          } else {
            //requesting other players specifically is not allowed
            throwBasedOnCode('e403.5');
          }
        }
      } else if (loggedInUser.role === 'coach') {
        if (req.body.names === undefined && (req.body.teams === undefined || req.body.teams.length === 0)) {
          throwBasedOnCode('e400.25');
        }
        //handled by buildQueryWithPermissions
      }       

      const performQuery = async (q:InfluxQuery) => {
        try {
          const combinationGraphData = await getCombinationGraphAPI(queryClient, q);
          res.status(200).send(combinationGraphData);
        } catch (error) {
          const errCode = getStatusCodeBasedOnError(error as Error);
          res.status(errCode).send({
            error: (error as Error).message,
            name: (error as Error).name,
          });
        }
      };

      performQuery(await buildQueryWithPermissions(sqlDB, queryClient, req.session.username!, req.body));

    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
    }
  });
}
