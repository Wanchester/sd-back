export type SQLPrimaryKey = 'username' | 'teamName';
export type SQLTableName = 'user' | 'teamcoach';
//NEVER cast 'User' to SQLTableName!!!!
//ALWAYS just use 'user'
export function getPrimaryKey(table: SQLTableName) :SQLPrimaryKey {
  switch (table) {
    case 'user':
      return 'username';
    case 'teamcoach':
      return 'teamName';
  }
}


const userTableModel = {
  username:      '',
  password:      '',
  name:          '', //?
  email:         '', //?
  dob:           '', //?
  nationality:   '', //?
  height:         0, //?
  weight:         0, //?
  role:          '',
};
const teamCoachTableModel = {
  teamName: '',
  teamID:    0,
  username: '',
};
export type UserTable = typeof userTableModel;
export type TeamCoachTable = typeof teamCoachTableModel;
export type SQLTable = UserTable & TeamCoachTable;

export type UserTableKey = keyof UserTable;
export type TeamCoachTableKey = keyof TeamCoachTable;
export type TableKey = UserTableKey | TeamCoachTableKey;

export type UserTableKeyType = UserTable[UserTableKey];
export type TeamCoachTableKeyType = TeamCoachTable[TeamCoachTableKey];
export type TableKeyType = UserTableKeyType | TeamCoachTableKeyType;

function isDigit(s: string) :boolean {
  return /^\d+$/.test(s);
}
function getModelTable(t: SQLTableName) : typeof userTableModel | typeof teamCoachTableModel {
  switch (t) {
    case 'user':
      return userTableModel;
    case 'teamcoach':
      return teamCoachTableModel;
  }
}

function getTableKeys(table: SQLTableName) 
  :UserTableKey[] | TeamCoachTableKey[] {
  let model = getModelTable(table);
  return Object.keys(model) as any; //if used, test for inherited object properties
}

export function isCorrectType(t: SQLTableName, k: TableKey, v: any) :boolean {
  let model = getModelTable(t);
  if (k in model) {
    let key: keyof typeof model = k as any; //appease TS
    if (typeof model[key] === 'number') {
      if (typeof v === 'number' || isDigit(v)) {
        return true;
      }
    } else if (typeof model[key] === typeof v) {
      return true;
    }
  }
  return false;
}

// function test() {
//   let a = isCorrectType('user', 'username', 'testname');//true
//   let b = isCorrectType('user', 'username', 5);//false
//   let c = isCorrectType('user', 'weight', 5);//true
//   let d = isCorrectType('user', 'weight', '5');//true
//   console.log(a, b, c, d);
// }
//test()

