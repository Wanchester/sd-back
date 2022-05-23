import { Express } from 'express';

const DEFAULT_USERNAME = 'warren';



export default function bindSessionEndpointToExpress(app: Express) {
    app.get('/session', async (req, res) => {
        let username  = DEFAULT_USERNAME;
        let trainningSessionAPI = await getTrainingSessionAPI(username);
        res.send(trainningSessionAPI);
    });
      
    app.get('/session/:username', async (req, res) => {
        let username  = req.params.username;
        let trainningSessionAPI = await getTrainingSessionAPI(username);
        res.send(trainningSessionAPI);
    });   
}


