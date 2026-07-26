import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());

// Serve static music files from public/music
app.use('/music', express.static(path.join(process.cwd(), 'public', 'music')));

// API Endpoint to dynamically list all MP3 files in public/music
app.get('/api/music-tracks', (req, res) => {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'music');
    if (fs.existsSync(musicDir)) {
      const files = fs.readdirSync(musicDir)
        .filter((file) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(file));
      return res.json(files);
    }
  } catch (err) {
    console.error('Error reading music directory:', err);
  }
  res.json([]);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Default Public Rooms
const PUBLIC_ROOMS = ['ROOM-1', 'ROOM-2', 'ROOM-3'];

// Rooms storage: roomId -> Map<socketId, Player>
const rooms = new Map();
// Room DJ State storage: roomId -> DJState
const roomDjStates = new Map();

// Initialize public rooms
PUBLIC_ROOMS.forEach((id) => {
  rooms.set(id, new Map());
  roomDjStates.set(id, {
    isPlaying: false,
    trackId: 'cyberpunk_synth',
    trackName: '⚡ Cyberpunk Synthwave Drive',
    customUrl: '',
    djName: 'Automated DJ',
    startTime: Date.now()
  });
});

function getPublicRoomsData() {
  return PUBLIC_ROOMS.map((id) => ({
    id,
    name: id.replace('-', ' Server '),
    count: rooms.has(id) ? rooms.get(id).size : 0,
    maxPlayers: 10
  }));
}

function broadcastPublicRooms() {
  io.emit('public_rooms_update', getPublicRoomsData());
}

io.on('connection', (socket) => {
  console.log(`[Connect] Socket ID: ${socket.id}`);
  let currentRoomId = null;

  socket.emit('socket_id', socket.id);
  socket.emit('public_rooms_update', getPublicRoomsData());

  socket.on('get_public_rooms', () => {
    socket.emit('public_rooms_update', getPublicRoomsData());
  });

  socket.on('join_room', ({ player, roomId }) => {
    // Leave previous room if any
    if (currentRoomId && rooms.has(currentRoomId)) {
      const prevRoom = rooms.get(currentRoomId);
      prevRoom.delete(socket.id);
      socket.to(currentRoomId).emit('player_left', socket.id);
      socket.leave(currentRoomId);
    }

    currentRoomId = roomId || 'ROOM-1';
    socket.join(currentRoomId);

    if (!rooms.has(currentRoomId)) {
      rooms.set(currentRoomId, new Map());
    }

    const roomPlayers = rooms.get(currentRoomId);
    const fullPlayer = { ...player, id: socket.id };
    roomPlayers.set(socket.id, fullPlayer);

    // Send existing room state to joined user
    socket.emit('room_state', Array.from(roomPlayers.values()));
    if (roomDjStates.has(currentRoomId)) {
      socket.emit('dj_state_update', roomDjStates.get(currentRoomId));
    }

    // Broadcast new player to room
    socket.to(currentRoomId).emit('player_joined', fullPlayer);
    console.log(`[Join] ${fullPlayer.name} (${socket.id}) joined room ${currentRoomId}`);

    // Update public room counts
    broadcastPublicRooms();
  });

  socket.on('update_dj_state', (djState) => {
    if (!currentRoomId) return;
    roomDjStates.set(currentRoomId, djState);
    io.to(currentRoomId).emit('dj_state_update', djState);
  });

  socket.on('update_position', ({ position, facingAngle }) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const roomPlayers = rooms.get(currentRoomId);
    const player = roomPlayers.get(socket.id);
    if (player) {
      player.position = position;
      player.facingAngle = facingAngle;
      socket.to(currentRoomId).emit('player_moved', {
        id: socket.id,
        position,
        facingAngle
      });
    }
  });

  socket.on('update_audio_state', ({ isMuted, isTalking }) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const roomPlayers = rooms.get(currentRoomId);
    const player = roomPlayers.get(socket.id);
    if (player) {
      player.isMuted = isMuted;
      player.isTalking = isTalking;
      socket.to(currentRoomId).emit('player_audio_state', {
        id: socket.id,
        isMuted,
        isTalking
      });
    }
  });

  socket.on('send_chat', (msg) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('chat_message', msg);
  });

  socket.on('send_emote', (emote) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('emote_received', emote);
  });

  socket.on('webrtc_signal', ({ targetId, signal }) => {
    io.to(targetId).emit('webrtc_signal', {
      fromId: socket.id,
      signal
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Disconnect] Socket ID: ${socket.id}`);
    if (currentRoomId && rooms.has(currentRoomId)) {
      const roomPlayers = rooms.get(currentRoomId);
      roomPlayers.delete(socket.id);
      socket.to(currentRoomId).emit('player_left', socket.id);
      if (roomPlayers.size === 0 && !PUBLIC_ROOMS.includes(currentRoomId)) {
        rooms.delete(currentRoomId);
      }
      broadcastPublicRooms();
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Spatial Audio Game Server listening on http://localhost:${PORT}`);
});
