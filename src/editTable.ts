import * as sqlite from 'sqlite3';
const sqlite3 = require('sqlite3').verbose();
const db: sqlite.Database = new sqlite3.Database('test.db');

function sanitize(input: string) :string {
  return ([...input].filter( 
    (c) => {
      return (
      c !== '-' &&
      c !== ';' &&
      c !== '/' &&
      c !== '\\' &&
      c !== '*' &&
      c !== '\'' &&
      c !== '"' &&
      c !== '=' &&
      c !== '&'
  )}
  ).join(''));
}

export function getPrimaryKey(table: string) :string {
  let t = table.toLowerCase();
  if (t === 'user') {
    return 'username';
  }
  else if (t === 'teamcoach') {
    return 'teamName';
  }
  return '';
}

export function updateTable(
  table: string, //known when clicked edit/user role permissions
  keyToEdit: string, //known when clicked edit
  newValue: string,
  primaryKey: string, //known from table^
  id: string, //known from login/clicked edit
): void {
  db.run(`UPDATE ${table} SET ${keyToEdit} = ? WHERE ${primaryKey} = ?`, [
    sanitize(newValue),
    id,
  ]);
}

export function userEditTable(key: string, value: string, id: string) {
  updateTable('User', key, value, 'username', id);
}

export function coachEditTable(key: string, value: string, id: string) {
  if (id[0] === 'c') {return;}
  updateTable('User', key, value, 'username', id);
}

export function adminEditTable(key: string, value: string, id: string, table: string) {
  let pk = getPrimaryKey(table);
  updateTable(table, key, value, pk, id);
}

function quicktest() {
  updateTable('User', 'Nationality', 'EDITED', 'username', 'c_coach1');

  //prepare more specified function
  //updateUserTable('Weight', 100);
}
quicktest();
