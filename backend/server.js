const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cors = require("cors")
const OpenAI = require('openai');

const app = express();
app.use(cors());


const availableLLMs = [{ short: "deepseek", long: "deepseek-ai/deepseek-r1-distill-llama-8b" }, { short: "llama", long: "meta-llama/llama-3.1-8b-instruct" }, { short: "qwen", long: "qwen/qwen3-14b:free" }];

console.log(`api key: ${process.env.OPENROUTER_KEY}`)

const openai = new OpenAI({
    apiKey: `${process.env.OPENROUTER_KEY}`,
    baseURL: "https://openrouter.ai/api/v1",
})

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
                    role: `user`,
                    content: `message from username: ${newMessage.user.name}.   ${message.text.replace('#share', '').trim()}`,
                    // timestamp: new Date()
                });
            });
        }


        var llmResponseMessage = {}

        // Check for LLM mentions
        const mentionMatch = message.text.match(/^@(\w+)\s+(.+)/);
        if (mentionMatch) {
            io.to(room).emit('message', newMessage);
            const [_, llmName, prompt] = mentionMatch;
            const llm = roomData.llms.find(l => l.name === llmName);

            if (llm) {
                llm.context = llm.context || [];
                // Add user message to context


                try {
                    io.to(room).emit('llmMessageStart', {
                        user: { id: 'system', name: llm.name },
                        text: "",
                        timestamp: new Date()
                    });

                    const llmResponse = await handleLLMRequest(llm, prompt, room, newMessage.user.name);

                    llmResponseMessage = {
                        user: { id: 'system', name: llm.name },
                        text: llmResponse,
                        timestamp: new Date()
                    }

                    io.to(room).emit("message", {
                        user: { id: 'system', name: llm.name },
                        text: llmResponse,
                        timestamp: new Date()
                    })

                    llm.context.push({
                        role: `user`,
                        content: `prompt from username: ${newMessage.user.name}. ${prompt}`,
                        // timestamp: new Date()
                    });

                    // Add LLM response to context
                    llm.context.push({
                        role: 'assistant',
                        content: `response from LLM assistant named ${llm.name}: ${llmResponse}`,
                        // timestamp: new Date()
                    });

                    io.to(room).emit('llmMessageEnd', {
                        user: { id: 'system', name: llm.name },
                        text: "",
                        timestamp: new Date()
                    });
                } catch (error) {
                    console.error('LLM error:', error);
                }
            }
        }


        // Store message and keep only last 100 messages
        roomData.messages = [...roomData.messages.slice(-99), newMessage];

        if (mentionMatch) {
            roomData.messages = [...roomData.messages.slice(-99), llmResponseMessage];
        }

        if (!mentionMatch) {
            io.to(room).emit('message', newMessage);
        }
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

    //TODO: take in llmname instead of config
    // LLM management

    socket.on('addLLMToRoom', (code, llmName) => {
        console.log("adding llm: ", llmName, "to room: ", code);
        // Check if the room exists
        if (!rooms.has(code)) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Check if the llmName exists in availableLLMs
        const llm = availableLLMs.find(l => l.short === llmName);
        if (!llm) {
            const serverMessage = {
                user: { id: "SERVER", name: "SERVER" },
                text: `Invalid LLM name: ${llmName}`,
                timestamp: new Date()
            };

            io.to(code).emit('message', serverMessage);
            return;
        }

        // Add the LLM to the room
        const room = rooms.get(code);
        room.llms.push({
            name: llmName,
            longName: llm.long,
            context: []
        });

        const serverMessage = {
            user: { id: "SERVER", name: "SERVER" },
            text: `LLM ${llmName} added to the room`,
            timestamp: new Date()
        };

        io.to(code).emit('message', serverMessage);
    });


    socket.on('removeLLMFromRoom', (code, index) => {
        if (rooms.has(code)) {
            rooms.get(code).llms = rooms.get(code).llms.filter((_, i) => i !== index);
        }
    });
});


// function getLongName(name) {
//     const llm = availableLLMs.find(llm => llm.short === name);
//     return llm ? llm.long : null;
// }

// NVIDIA NIM integration
async function handleLLMRequest(llmConfig, prompt, room, user) {
    const modelName = llmConfig.longName;

    console.log("model name: ", modelName);
    console.log("prompt: ", prompt);

    console.log("context: ", llmConfig.context);

    const completion = await openai.chat.completions.create({
        model: modelName,
        messages: llmConfig.context.concat([{ "role": "user", "content": `prompt from username: ${user}. no thinking tokens in response. ${prompt}` }]),
        temperature: 0.6,
        top_p: 0.7,
        max_tokens: 4096,
        stream: true
    });

    let finalResponse = ''; // Collect the streamed content here

    for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        finalResponse += content; // Append the streamed content
        io.to(room).emit('llmMessage', {
            user: { id: 'system', name: llmConfig.name },
            text: content,
            timestamp: new Date()
        });
    }

    return finalResponse; // Return the full response after streaming is complete
}


server.listen(3001, () => {
    console.log('Server running on port 3001');
});
