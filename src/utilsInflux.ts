export type InfluxQuery = {
  range: { start: Date, stop?: Date },
  names?: string[],
  teams?: string[],
  sessions?: string[],
  fields?: InfluxField[],
  time_window?: { every: number, period?: number }, //seconds
  func?: string, //must be a valid type //def "mean"
};

export type InfluxField = '2dAccuracy' |
'3dAccuracy' |
'Distance' |
'Height' |
'RunDistance' |
'SprintDistance' |
'TotalDistance' |
'TotalRunDistance' |
'TotalSprintDistance' |
'TotalWorkRate' |
'Velocity' |
'WorkRate' |
'lat' | 'lon';

export type InfluxField = '2dAccuracy' |
'3dAccuracy' |
'Distance' |
'Height' |
'RunDistance' |
'SprintDistance' |
'TotalDistance' |
'TotalRunDistance' |
'TotalSprintDistance' |
'TotalWorkRate' |
'Velocity' |
'WorkRate' |
'lat' | 'lon';

<<<<<<< HEAD
=======

>>>>>>> 487e9b0 (type for influx _field column values)
// input format: RFC3339
export function getDuration(first: string, second: string) :string {
  let f = new Date(first);
  let s = new Date(second);
  let differenceInMs = new Date(s.getTime() - f.getTime());

  let months = differenceInMs.getMonth();//already 0 indexed
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


function filterWithList(column: string, list: string[] | undefined) :string {
  let output: string[] = [];
  if (list !== undefined && list.length !== 0) {
    output.push(`|>filter(fn: (r)=> r["${column}"] == "${list[0]}"`);
    for (let name in list.slice(1)) {
      output.push(` or r["${column}"] == ${name}`);
    }
    output.push(')');
  }
  return output.join('');
}

export function buildQuery(query: InfluxQuery) :string {
  //TODO: validate all input fields
  let output = ['from(bucket: "test")'];
  //fill range
  //TODO!currently requre start range
  output.push(`|>range(start: ${Math.floor(query.range.start.getTime() / 1000)}`);
  if (query.range.stop !== undefined) {
    output.push(`, stop: ${Math.floor(query.range.stop.getTime() / 1000)}`);
  }
  output.push(')');

  //filter for all names,teams,sessions,fields,
  output.push(filterWithList('Player Name', query.names));
  output.push(filterWithList('_measurement', query.teams));
  output.push(filterWithList('Session', query.sessions));
  output.push(filterWithList('_field', query.fields));

  //window and aggregate with fn
  //TODO!currently assume ok window
  if (query.time_window !== undefined) {
    output.push(`|>window(every: ${query.time_window.every}s`);
    if (query.time_window.period !== undefined) {
      output.push(`, period: ${query.time_window.period}s`);
    }
    output.push(')');
    if (query.func !== undefined) {
      output.push(`|>${query.func}()`);
    } else {
      output.push('|>mean()');
    }
  }
  //collect as one window
  output.push('|>duplicate(column: "_stop", as: "_time")');
  output.push('|>window(every: inf)');
  return output.join('');
}


function buildTest() {
  console.log(buildQuery(
    {
      range: { start: new Date(0) },
      names: ['Warren'],
      teams: ['TeamBit'],
      fields: ['Velocity'],
      time_window: { every: 60 },
      func: 'mean',
    },
  ));
}
buildTest();


//function mytest() {
//  let a = '2022-02-10T10:45:36.103Z';
//  let b = '2022-03-10T06:30:26.233Z';
//  console.log(getDuration(a, b));//28:19:44:50
//  
//  let c = '2022-02-10T10:35:36.103Z';
//  let d = '2022-02-10T10:45:36.103Z';
//  let e = '2022-02-10T10:45:36.103Z';
//  let f = '2022-02-11T10:45:36.103Z';
//  console.log(getDuration(c, d));//00:10:00
//  console.log(getDuration(e, f));//01:00:00:00
//}
// mytest();
