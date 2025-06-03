const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// Room storage
const rooms = new Map();

// Generate unique join code
function generateJoinCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create new room
  socket.on('createRoom', (userName, callback) => {
    const code = generateJoinCode();
    rooms.set(code, {
      users: new Map([[socket.id, { id: socket.id, name: userName }]]),
      llm: null
    });
    socket.join(code);
    callback({ code });
  });

  // Join existing room
  socket.on('joinRoom', (code, userName, callback) => {
    if (!rooms.has(code)) {
      return callback({ error: 'Room not found' });
    }
    
    const room = rooms.get(code);
    room.users.set(socket.id, { id: socket.id, name: userName });
    socket.join(code);
    callback({ users: Array.from(room.users.values()) });
  });

  // Handle messages
  socket.on('sendMessage', async (message, callback) => {
    const room = Array.from(socket.rooms).find(room => room !== socket.id);
    if (!room || !rooms.has(room)) return;

    // Check if LLM response needed
    const roomData = rooms.get(room);
    if (roomData.llm && message.text.startsWith('/ask')) {
      const prompt = message.text.replace('/ask', '').trim();
      try {
        const llmResponse = await handleLLMRequest(roomData.llm, prompt);
        io.to(room).emit('message', {
          user: { id: 'system', name: 'AI' },
          text: llmResponse,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('LLM error:', error);
      }
    }

    io.to(room).emit('message', {
      user: roomData.users.get(socket.id),
      text: message.text,
      timestamp: new Date()
    });
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id && rooms.has(room)) {
        const roomData = rooms.get(room);
        roomData.users.delete(socket.id);
        if (roomData.users.size === 0) {
          rooms.delete(room);
        }
      }
    });
  });

  // LLM management
  socket.on('addLLMToRoom', (code, llmConfig) => {
    if (rooms.has(code)) {
      rooms.get(code).llm = llmConfig;
    }
  });

  socket.on('removeLLMFromRoom', (code) => {
    if (rooms.has(code)) {
      rooms.get(code).llm = null;
    }
  });
});

// NVIDIA NIM integration
async function handleLLMRequest(llmConfig, prompt) {
  const response = await axios.post(llmConfig.endpoint, {
    prompt,
    max_tokens: 200,
    temperature: 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.choices[0].text.trim();
}

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
