"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.getStatusCodeBasedOnError = exports.getStatusCodeBasedOnErrorMessage = exports.generateErrorBasedOnCode = void 0;
var string_interpolation_js_1 = require("string-interpolation-js");
var ExitCodeMap = {
    //400 Bad Request
    'e400.0': 'PUT request expects a valid object.',
    'e400.1': 'Given username is not a player or a coach.',
    'e400.2': 'You have already logged in.',
    'e400.3': 'Login failed. Username or password is incorrect.',
    'e400.4': 'Cannot find a player with given username :0',
    'e400.5': 'Cannot find a coach with given username :0',
    'e400.6': 'Cannot find an admin with given username :0',
    'e400.7': 'Cannot find an user with given username :0',
    'e400.8': 'Cannot find the input username :0 in your teams.',
    'e400.9': 'Team :0 does not have any training session with the name :1',
    'e400.10': 'The user :0 is not eligible to view the training session :2 of the team :1',
    'e400.11': 'System expect a valid object',
    'e400.12': 'You (username :0) are not associated with requested team :1',
    'e400.13': 'No Session associated with this Team \':0\'. Cannot find team players',
    'e400.14': 'Input \':0\' team name does not exist',
    'e400.15': 'Input \':0\' training session name does not exist',
    'e400.16': 'Cannot query future',
    'e400.17': 'Bad time window',
    //401 Unauthenticated, Unauthorised
    'e401.0': 'You must login in order to make this request.',
    'e401.1': 'You have to be a coach/admin to make this request.',
    'e401.2': 'You have to be an admin to make this request.',
    'e403.3': 'You have to be a player/coach to make this request',
    //403 Forbiden
    'e403.0': 'You are not allowed to edit the :0 attribute',
    // //404 Not Found
    // 'e404.0': 'Cannot find a player with given username :0',
    // 'e404.1': 'Cannot find a coach with given username :0',
    // 'e404.2': 'Cannot find an admin with given username :0',
    // 'e404.3': 'Cannot find an user with given username :0',
    // 'e404.4': 'Cannot find the input username :0 in your teams.',
    // 'e404.5': 'Team :0 does not have any training session with the name :1',
    // // 'e404.6': 'Cannot find any user with given :0 username of given :1 team in given :2 training session ', 
    // 'e404.6': 'The user :0 is not eligible to view the training session :2 of the team :1',
    //500 Server error
    'e500.0': 'An error occurred while executing InfluxDB queries. Reason: :0',
    'e500.1': 'An error occurred while executing SQL queries. Reason: :0'
};
function generateErrorBasedOnCode(exitCode) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return new Error("".concat(exitCode, ": ").concat((0, string_interpolation_js_1["default"])(ExitCodeMap[exitCode], args)));
}
exports.generateErrorBasedOnCode = generateErrorBasedOnCode;
function throwBasedOnCode(exitCode) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (Object.prototype.hasOwnProperty.call(ExitCodeMap, exitCode)) {
        throw generateErrorBasedOnCode.apply(void 0, __spreadArray([exitCode], args, false));
    }
}
exports["default"] = throwBasedOnCode;
function getStatusCodeBasedOnErrorMessage(message) {
    var _a;
    return Number.parseInt(((_a = message.match(/^e([0-9]{3})\./)) === null || _a === void 0 ? void 0 : _a[1]) || '418' /* I'm a teapot! */);
}
exports.getStatusCodeBasedOnErrorMessage = getStatusCodeBasedOnErrorMessage;
function getStatusCodeBasedOnError(error) {
    return getStatusCodeBasedOnErrorMessage(error.message);
}
exports.getStatusCodeBasedOnError = getStatusCodeBasedOnError;
