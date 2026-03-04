import { WebSocketServer, WebSocket } from 'ws';
import { wsArcjet } from './arcjet.js';

const matchSubscribers = new Map();

/*
  Subscribe a socket to a match
*/
function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }

    matchSubscribers.get(matchId).add(socket);

    console.log(`Subscriber added for match ${matchId}. Total:`,
        matchSubscribers.get(matchId).size
    );
}

/*
  Unsubscribe a socket from a match
*/
function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers) return;

    subscribers.delete(socket);

    console.log(`Subscriber removed for match ${matchId}. Remaining:`,
        subscribers.size
    );

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
}

/*
  Remove all subscriptions when socket disconnects
*/
function cleanupSubscribers(socket) {
    if (!socket.subscriptions) return;

    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
}

/*
  Attach WebSocket server to HTTP server
*/
export function attachWebsocketServer(server) {

    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024,
    });

    /*
      Send JSON safely
    */
    function sendJson(socket, payload) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    }

    /*
      Broadcast to all connected clients
    */
    function broadcastToAll(payload) {
        const message = JSON.stringify(payload);

        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    /*
      Broadcast to subscribers of a specific match
    */
    function broadcastToMatch(matchId, payload) {
        matchId = Number(matchId);

        const subscribers = matchSubscribers.get(matchId);

        console.log("Broadcasting to match:", matchId);
        console.log("Subscribers:", subscribers?.size || 0);

        if (!subscribers || subscribers.size === 0) return;

        const message = JSON.stringify(payload);

        for (const client of subscribers) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    /*
      Handle new websocket connection
    */
    wss.on('connection', async (socket, req) => {

        socket.isAlive = true;
        socket.subscriptions = new Set();

        socket.on('pong', () => {
            socket.isAlive = true;
        });

        /*
          Arcjet protection
        */
        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reason = decision.reason.isRateLimit()
                        ? 'Rate limit exceeded'
                        : 'Access denied';

                    socket.close(code, reason);
                    return;
                }

            } catch (err) {
                console.error('WS protection error:', err);
                socket.close(1011, 'internal error');
                return;
            }
        }

        sendJson(socket, { type: 'welcome' });

        /*
          Handle client messages
        */
        socket.on('message', (data) => {

            let message;

            try {
                message = JSON.parse(data.toString());
            } catch {
                return sendJson(socket, { type: 'error', message: 'Invalid JSON' });
            }

            console.log("Client message:", message);

            const matchId = Number(message.matchId);

            /*
              Subscribe
            */
            if (message?.type === 'subscribe' && !Number.isNaN(matchId)) {

                subscribe(matchId, socket);
                socket.subscriptions.add(matchId);

                return sendJson(socket, {
                    type: 'subscribed',
                    matchId
                });
            }

            /*
              Unsubscribe
            */
            if (message?.type === 'unsubscribe' && !Number.isNaN(matchId)) {

                unsubscribe(matchId, socket);
                socket.subscriptions.delete(matchId);

                return sendJson(socket, {
                    type: 'unsubscribed',
                    matchId
                });
            }

        });

        socket.on('close', () => cleanupSubscribers(socket));

        socket.on('error', (err) => {
            console.error('WebSocket error:', err);
            socket.terminate();
        });

    });

    /*
      Heartbeat (prevent dead connections)
    */
    const interval = setInterval(() => {

        wss.clients.forEach((ws) => {

            if (ws.isAlive === false) {
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping();

        });

    }, 30000);

    wss.on('close', () => clearInterval(interval));

    /*
      Public broadcast functions
    */

    function broadcastMatchCreated(match) {
        broadcastToAll({
            type: 'match_created',
            data: match,
        });
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, {
            type: 'commentary',
            data: comment,
        });
    }

    return {
        broadcastMatchCreated,
        broadcastCommentary,
    };
}
