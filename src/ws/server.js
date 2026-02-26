import {WebSocket, WebSocketServer} from 'ws';
import {wsArcjet} from "./arcjet.js";

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

export function attachWebsocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024,
    });

    wss.on('connection', async (socket,req) => {
        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if(decision.isDenied()){
                    const code = decision.reason.isRateLimit() ? 1013 : 1008
                    const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'access denied'
                }
                socket.close(code, reason);
            } catch (err) {
                console.error('ws connection failed', err);
                socket.close(1011, 'internal error');
                return
            }
        }

        sendJson(socket, {type: 'welcome'});

        socket.on('error', console.error);
    });

    function broadcast(payload) {
        for (const client of wss.clients) {
            if (client.readyState !== WebSocket.OPEN) continue;
            client.send(JSON.stringify(payload));
        }
    }

    function broadcastMatchCreated(match) {
        broadcast({
            type: 'match_created',
            data: match,
        });
    }

    return {
        broadcastMatchCreated,
    };
}
