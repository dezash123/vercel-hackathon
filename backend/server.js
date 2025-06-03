const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cors = require("cors")

const app = express();
app.use(cors());

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

app.use(apiLimiter);
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: true,
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
    if (typeof userName !== 'string' || userName.trim().length === 0 || userName.length > 30) {
      return callback({ error: 'Invalid user name' });
    }
    const code = generateJoinCode();
    rooms.set(code, {
      users: new Map([[socket.id, { id: socket.id, name: userName }]]),
      llms: [],
      messages: [], // Store message history
      createdAt: new Date()
    });
    socket.join(code);
    callback({ code });
  });

  // Join existing room
  socket.on('joinRoom', (code, userName, callback) => {
    if (typeof code !== 'string' || code.length !== 8) {
      return callback({ error: 'Invalid room code' });
    }
    if (typeof userName !== 'string' || userName.trim().length === 0 || userName.length > 30) {
      return callback({ error: 'Invalid user name' });
    }
    if (!rooms.has(code)) {
      return callback({ error: 'Room not found' });
    }
    
    const room = rooms.get(code);
    room.users.set(socket.id, { id: socket.id, name: userName });
    socket.join(code);
    callback({ 
      users: Array.from(room.users.values()),
      messages: room.messages.slice(-100) // Send last 100 messages
    });
  });

  // Handle messages
  socket.on('sendMessage', async (message, callback) => {
    if (typeof message.text !== 'string' || message.text.trim().length === 0 || message.text.length > 500) {
      return callback({ error: 'Invalid message' });
    }
    const room = Array.from(socket.rooms).find(room => room !== socket.id);
    if (!room || !rooms.has(room)) return;

    const roomData = rooms.get(room);

    // Handle message context and LLM prompts
    const newMessage = {
      user: roomData.users.get(socket.id),
      text: message.text,
      timestamp: new Date()
    };

    
    // Check for shared context updates
    if (message.text.includes('#share')) {
      roomData.llms.forEach(llm => {
        llm.context = llm.context || [];
        llm.context.push({
          role: 'user',
          content: message.text.replace('#share', '').trim(),
          timestamp: new Date()
        });
      });
    }

    // Check for LLM mentions
    const mentionMatch = message.text.match(/^@(\w+)\s+(.+)/);
    if (mentionMatch) {
      const [_, llmName, prompt] = mentionMatch;
      const llm = roomData.llms.find(l => l.name === llmName);
      
      if (llm) {
        llm.context = llm.context || [];
        // Add user message to context
        llm.context.push({
          role: 'user',
          content: prompt,
          timestamp: new Date()
        });

        try {
          const llmResponse = await handleLLMRequest(llm, prompt);
          
          // Add LLM response to context
          llm.context.push({
            role: 'assistant',
            content: llmResponse,
            timestamp: new Date()
          });

          io.to(room).emit('message', {
            user: { id: 'system', name: llm.name },
            text: llmResponse,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('LLM error:', error);
        }
      }
    }
    
    // Store message and keep only last 100 messages
    roomData.messages = [...roomData.messages.slice(-99), newMessage];
    
    io.to(room).emit('message', newMessage);
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
      rooms.get(code).llms.push({
        ...llmConfig,
        context: []
      });
    }
  });

  socket.on('removeLLMFromRoom', (code, index) => {
    if (rooms.has(code)) {
      rooms.get(code).llms = rooms.get(code).llms.filter((_, i) => i !== index);
    }
  });
});

// NVIDIA NIM integration
async function handleLLMRequest(llmConfig, prompt) {
  const response = await axios.post(llmConfig.endpoint, {
    prompt,
    context: llmConfig.context || [],
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
