import * as sqlite from 'sqlite3';
import * as DBI from './interfaceSQL';
//const sqlite3 = require('sqlite3').verbose();
//const db: sqlite.Database = new sqlite3.Database('test.db');
//db.configure('busyTimeout', 5000);

function sanitize(input: string) :string {
  let hasComment = input.includes('--');
  return (input.split('').filter( (c) => {
    return (
      (hasComment ? c !== '-' : true) && //remove dashes only if hasComment
      c !== ';' &&
      c !== '/' &&
      c !== '\\' &&
      c !== '*' &&
      c !== '\'' &&
      c !== '"' &&
      c !== '=' &&
      c !== '&'
    );
  },
  ).join(''));
}

function updateTable(
  db: sqlite.Database,
  table: DBI.SQLTableName, //known when clicked edit/user role permissions
  keyToEdit: DBI.TableKey, //known when clicked edit
  newValue: string,
  id: string, //known from login/clicked edit
): void {
  let pk = DBI.getPrimaryKey(table.toLowerCase() as DBI.SQLTableName);
  let t = table.toLowerCase();
  let k = keyToEdit.toLowerCase();

  //typecheck
  if (DBI.isCorrectType(t as DBI.SQLTableName, k as DBI.TableKey, newValue)) {
    //TODO!serialize this properly. Database busy error
    //update table
    db.serialize( function () {
      db.run(`UPDATE ${t} SET ${k} = ? WHERE ${pk} = ?`, [
        sanitize(newValue),
        id,
      ]);
    });
  } else {
    //TODO: maybe notify that types were wrong
  }
}

export function userEditTable(db:sqlite.Database, key: DBI.UserTableKey, value: string, id: string) {
  updateTable(db, 'user', key, value, id);
}




// function quicktest() {
//   updateTable(db,'user', 'nationality', 'EDITED', 'c_coach1');


//   //must fail
//   //coachEditTable("teamID", "astring", "c_coach1");
// }
// quicktest();
