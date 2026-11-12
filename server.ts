/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';

interface RoomData {
  state: any;
  messages: Array<{ id: string; _t: number; [key: string]: any }>;
  peers: Record<string, { role: string; name?: string; lastSeen: number }>;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory real-time room synchronization store
  const rooms: Record<string, RoomData> = {};

  const getOrCreateRoom = (roomId: string): RoomData => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        state: null,
        messages: [],
        peers: {},
      };
    }
    return rooms[roomId];
  };

  // 1. GET Room State and New Messages
  app.get('/api/sync/:roomId', (req, res) => {
    const { roomId } = req.params;
    const since = Number(req.query.since || 0);
    const room = getOrCreateRoom(roomId);

    // Clean up stale peers older than 15 seconds
    const now = Date.now();
    const activePeers = Object.entries(room.peers)
      .filter(([_, data]) => now - data.lastSeen < 15000)
      .map(([id, data]) => ({ id, ...data }));

    const newMsgs = room.messages.filter((m) => m._t > since);

    res.json({
      state: room.state,
      messages: newMsgs,
      peers: activePeers,
      now,
    });
  });

  // 2. POST State Update for Room
  app.post('/api/sync/:roomId/state', (req, res) => {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);
    room.state = { ...(room.state || {}), ...req.body };
    res.json({ success: true });
  });

  // 3. POST Real-time Broadcast Message (Shock, Meds, Rhythm change, etc.)
  app.post('/api/sync/:roomId/message', (req, res) => {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      _t: Date.now(),
      ...req.body,
    };

    room.messages.push(msg);

    // Keep last 150 messages
    if (room.messages.length > 150) {
      room.messages = room.messages.slice(-100);
    }

    res.json({ success: true, messageId: msg.id });
  });

  // 4. POST Peer Heartbeat
  app.post('/api/sync/:roomId/heartbeat', (req, res) => {
    const { roomId } = req.params;
    const { peerId, role, name } = req.body;
    if (peerId) {
      const room = getOrCreateRoom(roomId);
      room.peers[peerId] = {
        role: role || 'student',
        name: name || 'Operador',
        lastSeen: Date.now(),
      };
    }
    res.json({ success: true });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'TRAKAS-3000 Sync Server', timestamp: Date.now() });
  });

  // Vite development middleware or static serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TRAKAS-3000] Servidor de Simulación Activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TRAKAS-3000] Error iniciando servidor:', err);
});
