import interpole from 'string-interpolation-js';

const ExitCodeMap = {
  //400 Bad Request
  'e400.0': 'PUT request expects a valid object.',
  'e400.1': 'Given username is not a player or a coach.',
  'e400.2': 'You have already logged in.',
  'e400.3': 'Login failed. Username or password is incorrect.',

  //401 Unauthenticated, Unauthorised
  'e401.0': 'You must login in order to make this request.',
  'e401.1': 'You have to be a coach/admin to make this request.',
  'e401.2': 'You have to be an admin to make this request.',

  //403 Forbiden
  'e403.0': 'You are not allowed to edit the :0 attribute',

  //404 Not Found
  'e404.0': 'Cannot find a player with given username :0',
  'e404.1': 'Cannot find a coach with given username :0',
  'e404.2': 'Cannot find an admin with given username :0',
  'e404.3': 'Cannot find an user with given username :0',
  'e404.4': 'Cannot find the input username :0 in your teams.',
  'e404.5': 'Cannot find any training session with given :0 teamName and :1 sessionName',
  'e404.6': 'Cannot find any user with given :0 username of given :1 team in given :2 training session ',

  //500 Server error
  'e500.0': 'An error occurred while executing InfluxDB queries. Reason: :0',
  'e500.1': 'An error occurred while executing SQL queries. Reason: :0',
} as const;

export function generateErrorBasedOnCode(exitCode: keyof typeof ExitCodeMap, ...args: any[]) {
  return new Error(`${exitCode}: ${interpole(ExitCodeMap[exitCode], args)}`);
}

export default function throwBasedOnCode(exitCode: keyof typeof ExitCodeMap, ...args: any[]) {
  if (Object.prototype.hasOwnProperty.call(ExitCodeMap, exitCode)) {
    throw generateErrorBasedOnCode(exitCode, ...args);
  }
}