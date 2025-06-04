"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function SocketChatPage() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState("TestUser");
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [llmName, setLlmName] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => {
      setConnected(false);
      setCurrentRoom(null);
      setMessages([]);
    };
    const handleMessage = (msg) =>
      setMessages((prev) => [...prev, msg]);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message", handleMessage);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message", handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connect = () => {
    if (!socket) {
      const s = io("http://localhost:3001");
      setSocket(s);
    }
  };

  const disconnect = () => {
    socket?.disconnect();
    setSocket(null);
  };

  const createRoom = () => {
    if (!socket || !connected) return;
    const name = createName.trim() || userName.trim();
    if (!name) return;
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
    if (!socket || !connected) return;
    const code = joinCode.trim();
    const name = joinName.trim() || userName.trim();
    if (!code || !name) return;
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
    if (!socket || !connected || !currentRoom) return;
    const text = messageInput.trim();
    if (!text) return;
    socket.emit("sendMessage", { text }, (res) => {
      if (res?.error) alert("Error sending message: " + res.error);
    });
    setMessageInput("");
  };

  const addLLM = () => {
    if (!socket || !connected || !currentRoom) return;
    const name = llmName.trim();
    if (!name) return;
    socket.emit("addLLMToRoom", currentRoom, name);
    setLlmName("");
  };

  const messageClass = (msg) => {
    if (msg.user?.id === "system") return "text-blue-600";
    if (msg.user?.name?.startsWith("@")) return "text-green-600";
    return "";
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Socket Chat Demo</h1>
      <div>
        <span>Status: </span>
        <span className={connected ? "text-green-600" : "text-red-600"}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="space-x-2">
        <input
          className="border p-2"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="User name"
        />
        <button className="border px-3 py-1" onClick={connect}>
          Connect
        </button>
        <button
          className="border px-3 py-1"
          onClick={disconnect}
          disabled={!connected}
        >
          Disconnect
        </button>
      </div>

      <hr />

      <div className="space-x-2">
        <input
          className="border p-2"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="Create room as"
        />
        <button className="border px-3 py-1" onClick={createRoom}>
          Create Room
        </button>
      </div>

      <p className="font-bold">OR</p>

      <div className="space-x-2">
        <input
          className="border p-2"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Join code"
        />
        <input
          className="border p-2"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          placeholder="Join as"
        />
        <button className="border px-3 py-1" onClick={joinRoom}>
          Join Room
        </button>
      </div>

      <div>
        <strong>Current Room:</strong> {currentRoom || "None"}
      </div>

      {currentRoom && (
        <>
          <hr />
          <div>
            <h3 className="font-semibold mb-2">Messages</h3>
            <div className="border h-64 overflow-y-auto p-2 space-y-1">
              {messages.map((m, idx) => (
                <div key={idx} className={"text-sm " + messageClass(m)}>
                  <strong>{m.user?.name || "Unknown"}:</strong> {m.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="mt-2 space-x-2">
              <input
                className="border p-2 w-3/4"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message"
              />
              <button className="border px-3 py-1" onClick={sendMessage}>
                Send
              </button>
            </div>
          </div>

          <hr />
          <div className="space-x-2">
            <input
              className="border p-2"
              value={llmName}
              onChange={(e) => setLlmName(e.target.value)}
              placeholder="LLM name"
            />
            <button className="border px-3 py-1" onClick={addLLM}>
              Add LLM
            </button>
          </div>
        </>
      )}
    </div>
  );
}
