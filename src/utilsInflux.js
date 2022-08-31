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
exports.buildQuery = exports.getDuration = void 0;
var throws_1 = require("./throws");
function influxColumn(name) {
    switch (name) {
        case 'team': return '_measurement';
        case 'player': return 'Player Name';
        case 'sessions': return 'Session';
        //case 'field': return '_field';
        default: return 'oops';
    }
}
// input format: RFC3339
function getDuration(first, second) {
    var f = new Date(first);
    var s = new Date(second);
    var differenceInMs = new Date(s.getTime() - f.getTime());
    var months = differenceInMs.getMonth();
    var days = differenceInMs.getDate() - 1; //duration should be 0 indexed
    var hours = differenceInMs.getUTCHours(); //ignore timezone
    var minutes = differenceInMs.getUTCMinutes(); //australia actually has timezones with different minutes
    var seconds = differenceInMs.getSeconds();
    //only include longer measurements if non-zero
    var outputWithLong = [];
    if (months !== 0) {
        outputWithLong.push(months);
        outputWithLong.push(days);
    }
    else if (days !== 0) {
        outputWithLong.push(days);
    }
    var outputTemp = __spreadArray(__spreadArray([], outputWithLong, true), [hours, minutes, seconds], false).map(function (n) { return n.toString(); });
    var withPadding = outputTemp.map(function (n) { return n.padStart(2, '0'); });
    return withPadding.join(':');
}
exports.getDuration = getDuration;
// buildTest();
function buildQuery(query) {
    //TODO: validate all input fields
    //disallow empty object query. Would return all data
    if (Object.keys(query).length === 0) {
        return '';
    }
    var output = ['from(bucket: "test")'];
    //fill range
    if (query.range !== undefined) {
        if (query.range.stop !== undefined) {
            //swap ranges if wrong order
            if (new Date(query.range.start) > new Date(query.range.stop)) {
                var temp = query.range.start;
                query.range.start = query.range.stop;
                query.range.stop = temp;
            }
        }
        if (Math.max(new Date(query.range.start).getTime(), new Date(query.range.stop || query.range.start).getTime()) > new Date().getTime()) {
            //Error cannot query future
            (0, throws_1["default"])('e400.16');
        }
        output.push("|>range(start: ".concat(query.range.start));
        if (query.range.stop !== undefined) {
            output.push(", stop: ".concat(query.range.stop));
        }
        output.push(')');
    }
    else {
        output.push('|>range(start: 0)');
    }
    var filterWithList = function (column, list) {
        var outputBuffer = [];
        if (list !== undefined && list.length !== 0) {
            outputBuffer.push("|>filter(fn: (r)=> r[\"".concat(column, "\"] == \"").concat(list[0], "\""));
            for (var name_1 in list.slice(1)) {
                outputBuffer.push(" or r[\"".concat(column, "\"] == ").concat(name_1));
            }
            outputBuffer.push(')');
        }
        return outputBuffer.join('');
    };
    //filter for all names,teams,sessions,fields,
    output.push(filterWithList('Player Name', query.names));
    output.push(filterWithList('_measurement', query.teams));
    output.push(filterWithList('Session', query.sessions));
    output.push(filterWithList('_field', query.fields));
    //group and limit for get_unique
    if (query.get_unique !== undefined) {
        output.push("|>group(columns: [\"".concat(influxColumn(query.get_unique), "\"])"));
        output.push('|>limit(n: 1)');
    }
    //window and aggregate with fn
    if (query.time_window !== undefined) {
        if (query.time_window.every < 1) {
            (0, throws_1["default"])('e400.17');
        }
        output.push('|>group(columns: ["_field"])');
        output.push("|>window(every: ".concat(Math.floor(query.time_window.every), "s"));
        if (query.time_window.period !== undefined) {
            if (query.time_window.period < 1) {
                (0, throws_1["default"])('e400.17');
            }
            output.push(", period: ".concat(Math.floor(query.time_window.period), "s"));
        }
        output.push(')');
        if (query.time_window.func !== undefined) {
            output.push("|>".concat(query.time_window.func, "()"));
        }
        else {
            output.push('|>mean()');
        }
        //repair _time column after window
        output.push('|>duplicate(column: "_stop", as: "_time")');
    }
    //collect as one window
    output.push('|>window(every: inf)');
    return output.join('');
}
exports.buildQuery = buildQuery;
// function buildTest() {
//   console.log(buildQuery(
//     {
//       names: ['Warren'],
//       teams: ['TeamBit'],
//       fields: ['Velocity'],
//       time_window: { every: 60, func: 'mean' },
//     },
//   ));
//   console.log('\n');
//   console.log(buildQuery(
//     {
//       fields: ['Velocity'],
//       sessions: ['NULL 21/4/22'],
//       time_window:{ every: 86400, func: 'max' },
//     },
//   ));
//   console.log('\n');
//   console.log(buildQuery(
//     {
//       names: ['Warren'],
//       get_unique: 'team',
//     },
//   ));
//   console.log('\n');
//   console.log(buildQuery(
//     {
//       teams: ['TeamBit'],
//       get_unique: 'player',
//     },
//   ));
//   console.log('\n');
//   console.log(buildQuery(
//     {
//       names: ['Warren'],
//       fields: ['Height'],
//       time_window: { every: 5, func: 'median' },
//     },
//   ));
// }
// buildTest();
function buildTest2() {
    console.log(buildQuery({
        range: { start: '2022-08-21T00:00:00.0Z', stop: '2022-08-21T11:59:59.59Z' },
        names: ['Warren'],
        teams: ['TeamBit'],
        sessions: ['NULL 21/4/22'],
        fields: ['Velocity'],
        time_window: { every: 60 }
    }));
    // console.log('\n');
    // console.log(buildQuery(
    //   {
    //     fields: ['Velocity'],
    //     sessions: ['NULL 21/4/22'],
    //     time_window:{ every: 86400, func: 'max' },
    //   },
    // ));
    // console.log('\n');
    // console.log(buildQuery(
    //   {
    //     names: ['Warren'],
    //     get_unique: 'team',
    //   },
    // ));
    // console.log('\n');
    // console.log(buildQuery(
    //   {
    //     teams: ['TeamBit'],
    //     get_unique: 'player',
    //   },
    // ));
    // console.log('\n');
    // console.log(buildQuery(
    //   {
    //     names: ['Warren'],
    //     fields: ['Height'],
    //     time_window: { every: 5, func: 'median' },
    //   },
    // ));
}
buildTest2();
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
