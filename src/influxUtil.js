"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
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
exports.getDuration = void 0;
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
    var outputTemp = __spreadArray(__spreadArray([], __read(outputWithLong), false), [hours, minutes, seconds], false).map(function (s) { return s.toString(); });
    var withPadding = outputTemp.map(function (n) { return n.padStart(2, '0'); });
    return withPadding.join(':');
}
exports.getDuration = getDuration;
function mytest() {
    var a = "2022-02-10T10:45:36.103Z";
    var b = "2022-03-10T06:30:26.233Z";
    console.log(getDuration(a, b)); //28:19:44:50
    var c = "2022-02-10T10:35:36.103Z";
    var d = "2022-02-10T10:45:36.103Z";
    var e = "2022-02-10T10:45:36.103Z";
    var f = "2022-02-11T10:45:36.103Z";
    console.log(getDuration(c, d)); //00:10:00
    console.log(getDuration(e, f)); //01:00:00:00
}
mytest();
