export interface SessionResponseType {
  'sessionName': string,
  'sessionStart': string,
  'sessionStop': string,
  'teamName': string,
  'duration':string,
}

export interface HomepageResponseType {
  'username': string,
  'name': string,
  'email': string,
  'dob': string,
  'nationality': string,
  'height': number,
  'weight': number,
  'role': string,
  'teams':string[],
  'trainingSessions': SessionResponseType[],
}

export interface PersonalInfoResponseType {
  'username': string,
  'name': string,
  'email': string,
  'dob': string,
  'nationality': string,
  'height': number,
  'weight': number,
  'role': string,
  'teams':string[],
  'trainingSessions': SessionResponseType[],
}

export interface TrainingSessionsGetInterface {
  'teamName': string,
  'sessionName': string,
}


export interface TimeSeriesResponse { // for line graph
  [playerName:string]: {
    [fieldName:string]: [
      string,
      number,
    ][]
  }
}

// const example = { 
//   'Warren':
//     { 'Velocity': [['time1', 10], ['time2', 9], ['time3', 8]],
//       'Acceleration': [['time1', 10], ['time2', 9]],
//     }, 
//   'Jbk':
//     { 'Velocity': [['time1', 10], ['time2', 9], ['time3', 8]],
//       'Acceleration': [['time1', 10], ['time2', 9]],
//     }, 
// } as TimeSeriesResponse;

export interface CombinationGraphResponse {
  'line': {
    [fieldname:string]: [string, number][]
  },
  'bar':{
    [fieldName:string]: [string, number, string][]
  }
}

