"use client";

import { useState, useEffect } from "react";
import io from "socket.io-client";

export default function SocketChatPage() {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState("Disconnected");
  const [userName, setUserName] = useState("");
  const [createRoomName, setCreateRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinRoomName, setJoinRoomName] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [llmName, setLlmName] = useState("");

  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  const connectSocket = () => {
    if (socket) return;
    if (!userName.trim()) {
      alert("Please enter a user name to connect.");
      return;
    }
    const s = io("http://localhost:3001");
    setSocket(s);

    s.on("connect", () => {
      setStatus("Connected");
    });

    s.on("disconnect", () => {
      setStatus("Disconnected");
      setCurrentRoom(null);
      setMessages([]);
    });

    s.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on("llmMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const createRoom = () => {
    if (!socket || socket.disconnected) {
      alert("Please connect first.");
      return;
    }
    const name = createRoomName.trim() || userName.trim();
    if (!name) {
      alert("Please enter a user name.");
      return;
    }
    socket.emit("createRoom", name, (res) => {
      if (res.error) {
        alert("Error creating room: " + res.error);
      } else {
        setCurrentRoom(res.code);
        setMessages([]);
      }
    });
  };

  const joinRoom = () => {
    if (!socket || socket.disconnected) {
      alert("Please connect first.");
      return;
    }
    const code = joinRoomCode.trim();
    const name = joinRoomName.trim() || userName.trim();
    if (!code || !name) {
      alert("Please enter a room code and user name.");
      return;
    }
    socket.emit("joinRoom", code, name, (res) => {
      if (res.error) {
        alert("Error joining room: " + res.error);
      } else {
        setCurrentRoom(code);
        setMessages(res.messages || []);
      }
    });
  };

  const sendMessage = () => {
    if (!socket || socket.disconnected || !currentRoom) {
      alert("Please connect and join/create a room first.");
      return;
    }
    const text = messageInput.trim();
    if (!text) return;
    socket.emit("sendMessage", { text }, (res) => {
      if (res && res.error) alert("Error sending message: " + res.error);
    });
    setMessageInput("");
  };

  const addLLM = () => {
    if (!socket || socket.disconnected || !currentRoom) {
      alert("Please connect and join/create a room first.");
      return;
    }
    const name = llmName.trim();
    if (!name) return;
    socket.emit("addLLMToRoom", currentRoom, name);
    setLlmName("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Socket Chat Demo</h1>

      <div>
        <p>
          <strong>Status:</strong>{" "}
          <span className={status === "Connected" ? "text-green-600" : "text-red-600"}>{status}</span>
        </p>
        <div className="flex gap-2 mt-2">
          <input
            className="border px-2 py-1 flex-1"
            placeholder="User Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button className="border px-3 py-1" onClick={connectSocket} disabled={!!socket}>
            Connect
          </button>
          <button className="border px-3 py-1" onClick={disconnectSocket} disabled={!socket}>
            Disconnect
          </button>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold">Room Actions</h3>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="border px-2 py-1 flex-1"
              placeholder="Create Room as"
              value={createRoomName}
              onChange={(e) => setCreateRoomName(e.target.value)}
            />
            <button className="border px-3 py-1" onClick={createRoom}>
              Create Room
            </button>
          </div>
          <div className="text-center">OR</div>
          <div className="flex gap-2">
            <input
              className="border px-2 py-1"
              placeholder="Room Code"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value)}
            />
            <input
              className="border px-2 py-1 flex-1"
              placeholder="Join Room as"
              value={joinRoomName}
              onChange={(e) => setJoinRoomName(e.target.value)}
            />
            <button className="border px-3 py-1" onClick={joinRoom}>
              Join Room
            </button>
          </div>
          <p>
            <strong>Current Room:</strong> {currentRoom || "None"}
          </p>
        </div>
      </div>

      {currentRoom && (
        <div className="border-t pt-4 space-y-2">
          <h3 className="font-semibold">LLM Management</h3>
          <div className="flex gap-2">
            <input
              className="border px-2 py-1 flex-1"
              placeholder="LLM Name"
              value={llmName}
              onChange={(e) => setLlmName(e.target.value)}
            />
            <button className="border px-3 py-1" onClick={addLLM}>
              Add LLM
            </button>
          </div>
        </div>
      )}

      {currentRoom && (
        <div className="border-t pt-4 space-y-2">
          <h3 className="font-semibold">Messages</h3>
          <div className="border h-64 overflow-y-auto p-2 space-y-1" id="messages">
            {messages.map((msg, i) => {
              const cls = msg.user?.id === "system" ? "text-blue-600" : msg.user?.name?.startsWith("@") ? "text-green-600" : "";
              const name = msg.user ? msg.user.name : "Unknown";
              const time = new Date(msg.timestamp).toLocaleTimeString();
              return (
                <div key={i} className={cls}>
                  <strong>
                    {name} ({time}):
                  </strong>{" "}
                  {msg.text}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              className="border px-2 py-1 flex-1"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <button className="border px-3 py-1" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
