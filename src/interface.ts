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

export interface TimeSeriesResponse {
  data: [
    string, //RFC3339 date string. try 'new Date().toISOString()' to see the format. Date objects handle this well
    number,
  ][]
}