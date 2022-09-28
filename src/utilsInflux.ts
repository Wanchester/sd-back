import interpole from 'string-interpolation-js';
import { resolve as pathResolve } from 'path';
import { readFileSync } from 'fs';
import throwBasedOnCode from './throws';
import { QueryApi } from '@influxdata/influxdb-client';
import { executeInflux } from './utils';
export type InfluxColumn = 'teams' | 'players' | 'sessions';
export type InfluxQuery = { //TODO:need more specific name
  range?: { start: string, stop?: string },
  names?: string[],
  teams?: string[],
  sessions?: string[],
  fields?: InfluxField[],
  get_unique?: InfluxColumn,
  aggregate?: { 
    every?: number,  //seconds
    period?: number, //seconds
    func?: AggregateFunc,
    dont_mix?: InfluxColumn[],
  },
};
function influxColumn(name: InfluxColumn) :string | undefined {
  switch (name) {
    case 'teams': return '_measurement';
    case 'players': return 'Player Name';
    case 'sessions': return 'Session';
    //case 'field': return '_field';
    default: throwBasedOnCode('e400.18', name);
      //do not support this column error
  }
}
export type AggregateFunc = 'mean' | 'median' | 'mode' | 'max' | 'min' | 'timedMovingAverage';

export type InfluxField = '2dAccuracy' |
'3dAccuracy' |
'Distance' |
'Height' |
'Run Distance' |
'Sprint Distance' |
'Total Distance' |
'Total Run Distance' |
'Total Sprint Distance' |
'Total WorkRate' |
'Velocity' |
'Work Rate' |
'lat' | 'lon';

export async function getSessionBeginningAndEnd(sessionName: string, queryClient: QueryApi) {
  const loadedStartQuery = readFileSync(
    pathResolve(__dirname, '../../queries/session_start.flux'), { encoding: 'utf8' },
  );
  const loadedEndQuery = readFileSync(
    pathResolve(__dirname, '../../queries/session_end.flux'), { encoding: 'utf8' },
  );
  const readiedStartQuery = interpole(loadedStartQuery, [sessionName]);
  const readiedEndQuery = interpole(loadedEndQuery, [sessionName]);
  
  const sessionStartTimePromise = executeInflux(readiedStartQuery, queryClient);
  const sessionEndTimePromise = executeInflux(readiedEndQuery, queryClient);
  return { name: sessionName, beginning: (await sessionStartTimePromise)[0]._time, end: (await sessionEndTimePromise)[0]._time };
}

// input format: RFC3339
export function getDuration(first: string, second: string) :string {
  let f = new Date(first);
  let s = new Date(second);
  let differenceInMs = new Date(s.getTime() - f.getTime());

  let months = differenceInMs.getMonth();
  let days = differenceInMs.getDate() - 1;//duration should be 0 indexed
  let hours = differenceInMs.getUTCHours();//ignore timezone
  let minutes = differenceInMs.getUTCMinutes();//australia actually has timezones with different minutes
  let seconds = differenceInMs.getSeconds();

  //only include longer measurements if non-zero
  let outputWithLong = [];
  if (months !== 0) {
    outputWithLong.push(months);
    outputWithLong.push(days);
  } else if (days !== 0) {
    outputWithLong.push(days);
  }
  let outputTemp =  [...outputWithLong, hours, minutes, seconds].map((n)=>n.toString());
  let withPadding = outputTemp.map((n) => n.padStart(2, '0'));
  return withPadding.join(':');
}
// buildTest();



export function buildQuery(query: InfluxQuery) :string {
  //disallow empty object query. Would return all data
  if (Object.keys(query).length === 0) {throwBasedOnCode('e400.23');}

  let output = ['from(bucket: "test")'];
  //fill range
  if (query.range !== undefined) {
    if (query.range.stop !== undefined) {
      //swap ranges if wrong order
      if (new Date(query.range.start) > new Date(query.range.stop)) {
        const temp = query.range.start;
        query.range.start = query.range.stop;
        query.range.stop = temp;
      }
    }

    if (query.range.stop !== undefined) {
      //swap ranges if wrong order
      if (new Date(query.range.start) > new Date(query.range.stop)) {
        const temp = query.range.start;
        query.range.start = query.range.stop;
        query.range.stop = temp;
      }
    }
    if (Math.max(new Date(query.range.start).getTime(), new Date(query.range.stop || query.range.start).getTime()) > new Date().getTime()) {
      //Error cannot query future
      throwBasedOnCode('e400.16');
    }

    output.push(`|>range(start: ${query.range.start}`);
    if (query.range.stop !== undefined) {
      output.push(`, stop: ${query.range.stop}`);
    }
    output.push(')');
  } else {
    output.push('|>range(start: 0)');
  }

  const filterWithList = (column: string, list: string[] | undefined) => {
    let outputBuffer: string[] = [];
    if (list !== undefined && list.length !== 0) {
      outputBuffer.push(`|>filter(fn: (r)=> r["${column}"] == "${list[0]}"`);
      for (let n of (list.slice(1))) {
        outputBuffer.push(` or r["${column}"] == "${n}"`);
      }
      outputBuffer.push(')');
    }
    return outputBuffer.join('');
  };

  //filter for all names,teams,sessions,fields,
  output.push('|>filter(fn: (r) => r["topic"] !~ /.*log$/)');
  output.push(filterWithList('Player Name', query.names));
  output.push(filterWithList('_measurement', query.teams));
  output.push(filterWithList('Session', query.sessions));
  output.push(filterWithList('_field', query.fields));
  

  //group and limit for get_unique
  if (query.get_unique !== undefined) {
    output.push(`|>group(columns: ["${influxColumn(query.get_unique)}"])`);
    output.push('|>limit(n: 1)');
  }


  //window and aggregate with fn
  if (query.aggregate !== undefined ) {
    //default aggregation to arithmetic mean
    if (query.aggregate.func === undefined) {
      query.aggregate.func = 'mean';
    }

    //group
    output.push('|>group(columns: ["_field"');
    if (query.aggregate.dont_mix !== undefined) {
      for (let col of query.aggregate.dont_mix) {
        output.push(`, "${influxColumn(col)}"`);
      }
    }
    output.push('])');

    if (['mean', 'median', 'mode', 'max', 'min'].includes(query.aggregate.func)) {
      //window if good 'every' else error or skip
      if (query.aggregate.every !== undefined) {
        if (query.aggregate.every < 1) {throwBasedOnCode('e400.17');}
        output.push(`|>window(every: ${Math.floor(query.aggregate.every)}s`);

        //insert good period or error
        if (query.aggregate.period !== undefined ) {
          if (query.aggregate.period < 1) {throwBasedOnCode('e400.17');}
          output.push(`, period: ${Math.floor(query.aggregate.period)}s`);
        }
        //close window
        output.push(')');
      } else if (query.aggregate.period !== undefined) {
        //require 'every' if 'period' exists
        throwBasedOnCode('e400.24');
      }
      //if no window, this will be for all time
      //aggregate
      output.push(`|>${query.aggregate.func}()`);
      
      //repair _time column after window
      if (query.aggregate.every !== undefined) {
        //_time will be null if no window
        //that situation will only return one value for all time
        output.push('|>duplicate(column: "_stop", as: "_time")');
      }

    } else if (query.aggregate.func === 'timedMovingAverage') {
      if (query.aggregate.every === undefined || query.aggregate.period === undefined) {throwBasedOnCode('e400.22');}

      output.push(`|>${query.aggregate.func}(every: ${query.aggregate.every}s, period: ${query.aggregate.period}s)`);
    }
  }




  return output.join('');
}