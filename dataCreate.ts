import * as sqlite from 'sqlite3';
const sqlite3 = require('sqlite3').verbose();
const db: sqlite.Database = new sqlite3.Database('test.db');
import * as bcrypt from 'bcrypt';

let nameList = [
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

let coachList = [
  'Coach1',
  'Coach2',
];

let teamList = [ 
  'TeamBit',
  'TeamWanchester',
  'Team3',
];

let countryList = [ 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua & Deps', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Rep', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Congo (Democratic Rep)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland (Republic)', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea North', 'Korea South', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar (Burma)', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russian Federation', 'Rwanda', 'St Kitts & Nevis', 'St Lucia', 'Saint Vincent & the Grenadines', 'Samoa', 'San Marino', 'Sao Tome & Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe' ];

function nameToID(s: string, role: string) {
  return (
    role[0].toLowerCase() + '_' + 
      s.toLowerCase() //lowercase
        .split('') // spread into array of char
        .filter((c) => c !== ' ' && c !== '\t') //filter all whitespace
        .join('')
  );
}

function sample(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function insertUser(n: string, role: string) {
  const insertUserStmt = db.prepare('INSERT INTO User VALUES (?,?,?,?,?,?,?,?,?)');
  let id = nameToID(n, role);
  insertUserStmt.run(
    id,                                     //username
    bcrypt.hashSync('12345678', 10),        //password    
    n,                                      //name        
    id + '@gmail.com',                      //email       
    '01-01-1970',                           //dob         
    sample(countryList),                    //nationality 
    Math.floor(Math.random() * 80) + 150,   //height      cm
    Math.floor(Math.random() * 90) + 60,    //weight      kg
    role.toLowerCase(),                     //role
  );
  insertUserStmt.finalize();
}

db.serialize(() => {
  db.run(`CREATE TABLE User (
            username    TEXT NOT NULL,
            password    TEXT NOT NULL,
            name        TEXT,
            email       TEXT,
            dob         TEXT,
            nationality TEXT,
            height      INT,
            weight      INT,
            role        TEXT,
            PRIMARY KEY (username)
    )`);
   //TODO: primaryKeys areee unique. This restricts one coach per team
  db.run(`CREATE TABLE TeamCoach (
            teamName  TEXT PRIMARY KEY,
            teamID    INT NOT NULL, 
            username  TEXT NOT NULL
    )`);
            //FOREIGN KEY (username) REFERENCES User(username)
  
  //prepare users
  for (let n of nameList) {
    insertUser(n, 'Player');
  }

  //prepare admin
  insertUser('Administrator', 'Admin');

  //prepare coaches
  for (let n of coachList) {
    insertUser(n, 'Coach');
  }

  //prepare coach TEAMS
  const insertCoachTeamStmt = db.prepare('INSERT INTO TeamCoach VALUES (?,?,?)');
  insertCoachTeamStmt.run(teamList[0], nameToID(teamList[0], 'Team'), nameToID(coachList[0], 'coach'));
  insertCoachTeamStmt.run(teamList[1], nameToID(teamList[1], 'Team'), nameToID(coachList[1], 'coach'));
  insertCoachTeamStmt.run(teamList[2], nameToID(teamList[2], 'Team'), nameToID(coachList[0], 'coach'));
  insertCoachTeamStmt.finalize();



  //    db.each('SELECT Username AS id, Name FROM Users', (err, row) => {
  //        console.log(row.id + ': ' + row.Name);
  //    });



});
db.close();

