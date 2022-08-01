import interpole from 'string-interpolation-js';

const ExitCodeMap = {
  // Bad Request
  '400.0': 'PUT request expects a valid object.',

  // Unauthenticated, Unauthorised
  'e401.0': 'You must login in order to make a request.',
  'e401.1': 'You have to be a coach/admin to make this request.',
  'e401.2': 'You have to be an admin to make this request.',

  // Forbiden
  'e403.0': 'You are not allowed to edit the :0 attribute',

  // Not Found
  'e404.0': 'Cannot find a player with given username',
  'e404.1': 'Cannot find a coach with given username',
  'e404.2': 'Cannot find an admin with given username',
  'e404.3': 'Cannot find an user with given username',



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