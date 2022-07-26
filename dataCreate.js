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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
exports.__esModule = true;
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('test.db');
var nameList = [
    '5C3EBE',
    '6C3EBE',
    'Ballard',
    'Boucher',
    'Exon',
    'F4E2BC',
    'Flynn',
    'JD',
    'Jbk',
    'Kemp',
    'Maibaum',
    'NO PLAYER',
    'Nelson',
    'Nolan',
    'Pods',
    'Rigga',
    'Sibba',
    'Silv',
    'T Mac',
    'Warren',
];
var coachList = [
    'Coach1',
    'Coach2',
];
var teamList = [
    'TeamBit',
    'TeamWanchester',
    'Team3',
];
var countryList = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua & Deps', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Rep', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Congo (Democratic Rep)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland (Republic)', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea North', 'Korea South', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar (Burma)', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russian Federation', 'Rwanda', 'St Kitts & Nevis', 'St Lucia', 'Saint Vincent & the Grenadines', 'Samoa', 'San Marino', 'Sao Tome & Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'];
function nameToID(s, role) {
    return (role[0].toLowerCase() + '_' +
        __spreadArray([], __read((s.toLowerCase())), false).filter(function (c) { return c !== ' ' && c !== '\t'; }) //filter all whitespace
            .join(''));
}
function sample(array) {
    return array[Math.floor(Math.random() * array.length)];
}
;
function insertUser(n, role) {
    var insertUserStmt = db.prepare('INSERT INTO User VALUES (?,?,?,?,?,?,?,?,?)');
    var id = nameToID(n, role);
    insertUserStmt.run(id, //username
    '12345678', //password    
    n, //name        
    id + '@gmail.com', //email       
    '01-01-1970', //dob         
    sample(countryList), //nationality 
    Math.floor(Math.random() * 80) + 150, //height      cm
    Math.floor(Math.random() * 90) + 60, //weight      kg
    role.toLowerCase());
    insertUserStmt.finalize();
}
db.serialize(function () {
    var e_1, _a, e_2, _b;
    db.run("CREATE TABLE User (\n            username    TEXT NOT NULL,\n            password    TEXT NOT NULL,\n            name        TEXT,\n            email       TEXT,\n            dob         TEXT,\n            nationality TEXT,\n            height      INT,\n            weight      INT,\n            role        TEXT,\n            PRIMARY KEY (username)\n    )");
    //TODO: primaryKeys areee unique. This restricts one coach per team
    db.run("CREATE TABLE TeamCoach (\n            teamName  TEXT PRIMARY KEY,\n            teamID    INT NOT NULL, \n            username  TEXT NOT NULL\n    )");
    try {
        //FOREIGN KEY (username) REFERENCES User(username)
        //prepare users
        for (var nameList_1 = __values(nameList), nameList_1_1 = nameList_1.next(); !nameList_1_1.done; nameList_1_1 = nameList_1.next()) {
            var n = nameList_1_1.value;
            insertUser(n, 'Player');
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (nameList_1_1 && !nameList_1_1.done && (_a = nameList_1["return"])) _a.call(nameList_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    //prepare admin
    insertUser("Administrator", 'Admin');
    try {
        //prepare coaches
        for (var coachList_1 = __values(coachList), coachList_1_1 = coachList_1.next(); !coachList_1_1.done; coachList_1_1 = coachList_1.next()) {
            var n = coachList_1_1.value;
            insertUser(n, 'Coach');
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (coachList_1_1 && !coachList_1_1.done && (_b = coachList_1["return"])) _b.call(coachList_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    //prepare coach TEAMS
    var insertCoachTeamStmt = db.prepare('INSERT INTO TeamCoach VALUES (?,?,?)');
    insertCoachTeamStmt.run(teamList[0], nameToID(teamList[0], "Team"), nameToID(coachList[0], "coach"));
    insertCoachTeamStmt.run(teamList[1], nameToID(teamList[1], "Team"), nameToID(coachList[1], "coach"));
    insertCoachTeamStmt.run(teamList[2], nameToID(teamList[2], "Team"), nameToID(coachList[0], "coach"));
    insertCoachTeamStmt.finalize();
    //    db.each('SELECT Username AS id, Name FROM Users', (err, row) => {
    //        console.log(row.id + ': ' + row.Name);
    //    });
});
db.close();
