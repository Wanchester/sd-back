import bcrypt from 'bcrypt';
import { Database } from 'sqlite3';
import { Express } from 'express';
import { generateErrorBasedOnCode } from './throws';
import session from 'express-session';

declare module 'express-session' {
  interface SessionData {
    username?: string;
  }
}

export default function bindLoginAPI(app: Express, sqlDB: Database) {
  app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SD_SERVER_INFLUX_API_KEY || 'Wanchester',
  }));

  app.post('/login', (req, res) => {
    if (req.session.username) {
      res.status(400).send({
        name: 'Error',
        error: generateErrorBasedOnCode('e400.2').message,
      });
    } else {
      const username = req.body.username as string;
      const password = req.body.password as string;

      sqlDB.serialize(() => {
        const stmt = sqlDB.prepare('SELECT password FROM User WHERE username = ? LIMIT 1');
        stmt.get(username, (err, row) => {
          if (err) {
            res.status(500).send({
              name: 'Error',
              error: generateErrorBasedOnCode('e500.1', err.message).message,
            });
          } else if (row) {
            const passwordHash = row.password;
            bcrypt.compare(password, passwordHash, (err, same) => { // eslint-disable-line
              if (err) {
                res.status(500).send({
                  name: 'Error',
                  error: generateErrorBasedOnCode('e500.1', err.message).message,
                });
              } else {
                if (same) {
                  req.session.username = username;
                  res.status(200).send({ username });
                } else {
                  res.status(400).send({
                    name: 'Error',
                    error: generateErrorBasedOnCode('e400.3').message,
                  });
                }
              }
            });
          } else {
            res.status(400).send({
              name: 'Error',
              error: generateErrorBasedOnCode('e400.3').message,
            });
          }
        });
      });
    }
  });

  app.get('/login', (req, res) => {
    const username = req.session.username;

    if (username) {
      res.status(200).send({ loggedIn: username });
    } else {
      res.status(401).send({
        name: 'Error',
        error: generateErrorBasedOnCode('e401.0').message,
      });
    }
  });

  app.post('/logout', (req, res) => {
    const username = req.session.username;
    req.session.username = undefined;
    res.status(200).send({ loggedOut: username ?? '' });
  });
}