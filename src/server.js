import express from 'express';
import http from 'http';
import {matchRouter} from "./routes/matches.js";
import {attachWebsocketServer} from "./ws/server.js";
import {securityMiddleware} from "./ws/arcjet.js";


const port = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '127.0.0.1';

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use(securityMiddleware());
app.get('/', (req, res) => {
    res.send('Hello from server');
})

app.use('/matches', matchRouter);

const {broadcastMatchCreated} = attachWebsocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(port, HOST,  () => {
    const baseUrl = HOST === '127.0.0.1' ? `http://localhost:${port}`  : `http://${HOST}:${port}`
    console.log(`Server listening on port ${baseUrl}`);
    console.log(`websocket server listening on ${baseUrl.replace('http', 'ws')}/ws` );
})
