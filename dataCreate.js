var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
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
    'Warren'
];
var coachList = [
    'Coach1',
    'Coach2'
];
var teamList = [
    'Teambit',
    'Wanchester'
];
var countryList = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua & Deps', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Rep', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Congo (Democratic Rep)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland (Republic)', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea North', 'Korea South', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar (Burma)', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russian Federation', 'Rwanda', 'St Kitts & Nevis', 'St Lucia', 'Saint Vincent & the Grenadines', 'Samoa', 'San Marino', 'Sao Tome & Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'];
function nameToID(s) {
    return (__spreadArray([], (s.toLowerCase()), true).filter(function (c) { return c !== ' ' && c !== '\t'; }) //filter all whitespace
        .join(''));
}
Array.prototype.sample = function () {
    return this[Math.floor(Math.random() * this.length)];
};
function insertUser(n, role) {
    var insertUser_stmt = db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)');
    var id = nameToID(n);
    insertUser_stmt.run(id, //username    
    '12345678', //password    
    n, //name        
    id + '@gmail.com', //email       
    '01-01-1970', //dob         
    countryList.sample(), //nationality 
    Math.floor((Math.random() * 80)) + 150, //height      cm
    Math.floor((Math.random() * 90)) + 60, //weight      kg
    role //role
    );
    insertUser_stmt.finalize();
}
db.serialize(function () {
    db.run("CREATE TABLE users (\n            username    TEXT NOT NULL PRIMARY KEY,\n            password    TEXT NOT NULL,\n            name        TEXT,\n            email       TEXT,\n            dob         TEXT,\n            nationality TEXT,\n            height      INT,\n            weight      INT,\n            role        TEXT\n    )");
    db.run("CREATE TABLE coach (\n            username TEXT NOT NULL PRIMARY KEY,\n            name     TEXT\n    )");
    db.run("CREATE TABLE coachTeams (\n            teamID    INT NOT NULL PRIMARY KEY,\n            teamName  TEXT,\n            username  TEXT NOT NULL,\n            FOREIGN KEY (username) REFERENCES coach(username)\n    )");
    //prepare users
    for (var _i = 0, nameList_1 = nameList; _i < nameList_1.length; _i++) {
        var n = nameList_1[_i];
        insertUser(n, 'Player');
    }
    //prepare coach
    var insertCoach_stmt = db.prepare('INSERT INTO coach VALUES (?,?)');
    for (var _a = 0, coachList_1 = coachList; _a < coachList_1.length; _a++) {
        var n = coachList_1[_a];
        insertCoach_stmt.run(nameToID(n), //username
        '12345678' //name
        );
    }
    insertCoach_stmt.finalize();
    //prepare coach TEAMS
    var insertCoachTeams_stmt = db.prepare('INSERT INTO coachTeams VALUES (?,?,?)');
    for (var i = 0; i < teamList.length; i++) {
        var n = teamList[i];
        insertCoachTeams_stmt.run(nameToID(n), //teamID
        n, //teamName
        coachList[i] //username
        );
    }
    insertCoachTeams_stmt.finalize();
    //    db.each('SELECT Username AS id, Name FROM Users', (err, row) => {
    //        console.log(row.id + ': ' + row.Name);
    //    });
});
db.close();
