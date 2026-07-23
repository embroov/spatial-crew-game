import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Rooms storage: roomId -> Map<socketId, Player>
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`[Connect] Socket ID: ${socket.id}`);
  let currentRoomId = null;

  // Send socket id back to client
  socket.emit('socket_id', socket.id);

  socket.on('join_room', ({ player, roomId }) => {
    currentRoomId = roomId || 'LOBBY-001';
    socket.join(currentRoomId);

    if (!rooms.has(currentRoomId)) {
      rooms.set(currentRoomId, new Map());
    }

    const roomPlayers = rooms.get(currentRoomId);
    const fullPlayer = { ...player, id: socket.id };
    roomPlayers.set(socket.id, fullPlayer);

    // Send existing room players to joined user
    socket.emit('room_state', Array.from(roomPlayers.values()));

    // Broadcast new player to room
    socket.to(currentRoomId).emit('player_joined', fullPlayer);
    console.log(`[Join] ${fullPlayer.name} (${socket.id}) joined room ${currentRoomId}`);
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
      if (roomPlayers.size === 0) {
        rooms.delete(currentRoomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Spatial Audio Game Server listening on http://localhost:${PORT}`);
});
