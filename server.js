const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname)));

const players = {};
const orbs = [];
const orbCount = 100;

function generateOrb() {
  return {
    id: uuidv4(),
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    r: 5
  };
}

for (let i = 0; i < orbCount; i++) {
  orbs.push(generateOrb());
}

function broadcastPlayers() {
  const payload = JSON.stringify({
    type: 'update',
    players: Object.values(players),
    orbs: orbs
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', ws => {
  const id = uuidv4();
  players[id] = {
    id,
    x: Math.random() * 800,
    y: Math.random() * 600,
    xp: 0,
    shapeLevel: 0,
    hp: 100,
    maxHp: 100,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  ws.send(JSON.stringify({ type: 'init', id }));

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'move') {
        const p = players[id];
        p.x = data.x;
        p.y = data.y;
        p.hp = data.hp;
        p.xp = data.xp;
        p.shapeLevel = data.shapeLevel;
        p.maxHp = data.maxHp;
      } else if (data.type === 'collect') {
        const orbIndex = orbs.findIndex(o => o.id === data.id);
        if (orbIndex !== -1) {
          orbs[orbIndex] = generateOrb();
        }
      }
    } catch (e) {
      console.error('Erro ao processar mensagem:', e);
    }
  });

  ws.on('close', () => {
    delete players[id];
    broadcastPlayers();
  });

  setInterval(broadcastPlayers, 100);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor rodando em porta ${PORT}`);
});
