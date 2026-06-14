const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Serve static game files
app.use(express.static(__dirname));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

// Room state storage
const rooms = {};

// Helper: Generate a unique 4-digit room code
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[code]);
  return code;
}

wss.on('connection', (ws) => {
  ws.roomId = null;
  ws.playerIndex = null; // 1, 2, 3, or 4

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error('Failed to parse socket message:', e);
      return;
    }

    switch (data.type) {
      case 'createRoom': {
        const code = generateRoomCode();
        rooms[code] = {
          code: code,
          clients: [ws],
          locked: false,
          gameMode: 'story'
        };
        ws.roomId = code;
        ws.playerIndex = 1; // 1P (Host)
        
        ws.send(JSON.stringify({
          type: 'roomCreated',
          roomCode: code,
          playerIndex: 1
        }));
        console.log(`Room ${code} created by Player 1`);
        break;
      }

      case 'joinRoom': {
        const code = data.roomCode;
        const room = rooms[code];

        if (!room) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'ルームが見つかりません。'
          }));
          return;
        }

        if (room.locked) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'このルームはロックされています。'
          }));
          return;
        }

        if (room.clients.length >= 4) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'ルームは満員です（最大4人）。'
          }));
          return;
        }

        // Find the first vacant player index among 2, 3, 4
        const activeIndices = room.clients.map(c => c.playerIndex);
        let assignedIndex = null;
        for (let i = 2; i <= 4; i++) {
          if (!activeIndices.includes(i)) {
            assignedIndex = i;
            break;
          }
        }

        ws.roomId = code;
        ws.playerIndex = assignedIndex;
        room.clients.push(ws);

        // Notify joiner
        ws.send(JSON.stringify({
          type: 'roomJoined',
          roomCode: code,
          playerIndex: assignedIndex,
          players: room.clients.map(c => c.playerIndex),
          locked: room.locked,
          gameMode: room.gameMode
        }));

        // Notify other clients in the room
        room.clients.forEach((client) => {
          if (client !== ws) {
            client.send(JSON.stringify({
              type: 'playerJoined',
              playerIndex: assignedIndex
            }));
          }
        });

        // Let the joiner know about existing players in the room
        room.clients.forEach((client) => {
          if (client !== ws) {
            ws.send(JSON.stringify({
              type: 'playerJoined',
              playerIndex: client.playerIndex
            }));
          }
        });

        console.log(`Player ${assignedIndex} joined Room ${code}`);
        break;
      }

      case 'toggleLock': {
        if (ws.roomId && rooms[ws.roomId]) {
          const room = rooms[ws.roomId];
          if (ws.playerIndex === 1) { // Host only (Player 1)
            room.locked = !room.locked;
            const msg = JSON.stringify({
              type: 'lobbyLockStatus',
              locked: room.locked
            });
            room.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
            console.log(`Room ${ws.roomId} lock status toggled to: ${room.locked}`);
          }
        }
        break;
      }

      case 'lobbyConfigSync': {
        if (ws.roomId && rooms[ws.roomId]) {
          const room = rooms[ws.roomId];
          if (ws.playerIndex === 1) { // Host only (Player 1)
            room.gameMode = data.gameMode;
            const msg = JSON.stringify({
              type: 'lobbyConfigSync',
              gameMode: room.gameMode
            });
            room.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
            console.log(`Room ${ws.roomId} gameMode synced to: ${room.gameMode}`);
          }
        }
        break;
      case 'ping': {
        ws.send(JSON.stringify({
          type: 'pong'
        }));
        break;
      }


      default: {
        // Relay all gameplay sync messages to other players in the same room
        if (ws.roomId && rooms[ws.roomId]) {
          const room = rooms[ws.roomId];
          // Attach the sender's playerIndex to the relayed packet
          data.senderIndex = ws.playerIndex;
          const broadcastData = JSON.stringify(data);

          room.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      const room = rooms[ws.roomId];
      const index = room.clients.indexOf(ws);
      if (index > -1) {
        room.clients.splice(index, 1);
      }

      console.log(`Player ${ws.playerIndex} disconnected from Room ${ws.roomId}`);

      if (ws.playerIndex === 1) {
        // Host disconnected -> Close room and kick others
        console.log(`Host disconnected. Closing Room ${ws.roomId}`);
        room.clients.forEach((client) => {
          client.send(JSON.stringify({
            type: 'hostDisconnected',
            message: 'ホストが切断されました。メニューに戻ります。'
          }));
          client.roomId = null;
          client.playerIndex = null;
        });
        delete rooms[ws.roomId];
      } else {
        // Client disconnected -> Notify remaining players
        room.clients.forEach((client) => {
          client.send(JSON.stringify({
            type: 'playerLeft',
            playerIndex: ws.playerIndex
          }));
        });
        // If room becomes empty, clean it up
        if (room.clients.length === 0) {
          delete rooms[ws.roomId];
        }
      }
    }
  });
});

server.listen(port, () => {
  console.log(`CYBER DANMAKU server listening on port ${port}`);
});
