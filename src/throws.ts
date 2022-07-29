const ExitCodeMap = {
  'e401.0': 'You must login in order to make a request.',
  'e401.1': 'You have to be a coach/admin to make this request.',
  'e401.2': 'You have to be an admin to make this request.',
} as const;

export default function throwBasedOnCode(exitCode: keyof typeof ExitCodeMap) {
  if (Object.prototype.hasOwnProperty.call(ExitCodeMap, exitCode)) {
    throw new Error(`${exitCode}: ${ExitCodeMap[exitCode]}`);
  }
}