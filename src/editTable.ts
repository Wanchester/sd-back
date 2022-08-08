import * as sqlite from 'sqlite3';
import * as DBI from './interfaceSQL';
const sqlite3 = require('sqlite3').verbose();
const db: sqlite.Database = new sqlite3.Database('test.db');

function sanitize(input: string) :string {
  if (typeof input === 'number') {return input;}
  let hasComment = input.includes('--');
  return ([...input].filter( (c) => {
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
    db.run(`UPDATE ${t} SET ${k} = ? WHERE ${pk} = ?`, [
      sanitize(newValue),
      id,
    ]);
  } else {
    //TODO: maybe notify that types were wrong
  }
}

export function userEditTable(key: DBI.UserTableKey, value: string, id: string) {
  updateTable('user', key, value, id);
}

export function coachEditTable(key: DBI.TableKey, value: string, id: string, coachUsername: string) {
  if (id !== coachUsername && id[0] === 'c' || id[0] === 'a') {
    return;
  }
  updateTable('user', key, value, id);
}

export function adminEditTable(key: DBI.TableKey, 
  value: string, id: string, table: DBI.SQLTableName) {
  updateTable(table, key, value, id);
}

//function quicktest() {
//  updateTable('user', 'nationality', 'EDITED', 'c_coach1');
//  userEditTable('email', 'TESTTESTESTETSETSETSETSE', 'p_warren');
//  coachEditTable('nationality', 'EDIT 2!', 'c_coach1', 'c_coach1');
//}
//quicktest();
