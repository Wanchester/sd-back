const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('test.db');


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
    'Warren'
];

let coachList =[
    'Coach1',
    'Coach2'
]

let teamList = [ 
    'Teambit',
    'Wanchester'
]

let countryList = [ 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua & Deps', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Rep', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Congo (Democratic Rep)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland (Republic)', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea North', 'Korea South', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar (Burma)', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russian Federation', 'Rwanda', 'St Kitts & Nevis', 'St Lucia', 'Saint Vincent & the Grenadines', 'Samoa', 'San Marino', 'Sao Tome & Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe' ]

function nameToID(s: string){
    return ([...(s.toLowerCase())]              //lowercase
        .filter((c) => c !== ' ' && c !== '\t') //filter all whitespace
        .join('')
    )
}

interface Array<T> {
    sample(): T;
}
Array.prototype.sample = function() {
    return this[Math.floor(Math.random()*this.length)];
}

function insertUser(n: string,role: string) {
    const insertUser_stmt = db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)');
    let id = nameToID(n);
    insertUser_stmt.run(
        id,                                     //username    
        '12345678',                             //password    
        n,                                      //name        
        id+'@gmail.com',                        //email       
        '01-01-1970',                           //dob         
        countryList.sample(),                   //nationality 
        Math.floor((Math.random() *80)) + 150,  //height      cm
        Math.floor((Math.random() *90))+ 60,    //weight      kg
        role                                    //role
    );
    insertUser_stmt.finalize();
}

db.serialize(() => {
    db.run(`CREATE TABLE users (
            username    TEXT NOT NULL PRIMARY KEY,
            password    TEXT NOT NULL,
            name        TEXT,
            email       TEXT,
            dob         TEXT,
            nationality TEXT,
            height      INT,
            weight      INT,
            role        TEXT
    )`);

    db.run(`CREATE TABLE coach (
            username TEXT NOT NULL PRIMARY KEY,
            name     TEXT
    )`);

    db.run(`CREATE TABLE coachTeams (
            teamID    INT NOT NULL PRIMARY KEY,
            teamName  TEXT,
            username  TEXT NOT NULL,
            FOREIGN KEY (username) REFERENCES coach(username)
    )`);

    //prepare users
    for (let n of nameList) {
        insertUser(n, 'Player')
    }

    //prepare coach
    const insertCoach_stmt = db.prepare('INSERT INTO coach VALUES (?,?)');
    for (let n of coachList) {
        insertCoach_stmt.run(
            nameToID(n),          //username
            '12345678'            //name
        )}
    insertCoach_stmt.finalize();

    //prepare coach TEAMS
    const insertCoachTeams_stmt = db.prepare('INSERT INTO coachTeams VALUES (?,?,?)');
    for (let i=0; i<teamList.length; i++) {
        let n = teamList[i]
        insertCoachTeams_stmt.run(
            nameToID(n),          //teamID
            n,                    //teamName
            coachList[i]          //username
        )}
    insertCoachTeams_stmt.finalize();



//    db.each('SELECT Username AS id, Name FROM Users', (err, row) => {
//        console.log(row.id + ': ' + row.Name);
//    });



});
db.close();