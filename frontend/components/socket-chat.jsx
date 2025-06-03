"use client"
import { useEffect, useRef, useState } from "react"
import io from "socket.io-client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SocketChat({ roomId, userName }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [llmName, setLlmName] = useState("")
  const [llms, setLlms] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const s = io("http://localhost:3001")
    setSocket(s)

    s.on("connect", () => setConnected(true))
    s.on("disconnect", () => setConnected(false))
    s.on("message", (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    s.emit("joinRoom", roomId, userName, (res) => {
      if (!res?.error) {
        setMessages(res.messages || [])
      }
    })

    return () => {
      s.disconnect()
    }
  }, [roomId, userName])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (!socket || !connected || !input.trim()) return
    socket.emit("sendMessage", { text: input.trim() })
    setInput("")
  }

  const addLLM = () => {
    if (!socket || !connected || !llmName.trim()) return
    socket.emit("addLLMToRoom", roomId, llmName.trim())
    setLlms((prev) => [...prev, llmName.trim()])
    setLlmName("")
  }

  const removeLLM = (index) => {
    if (!socket || !connected) return
    socket.emit("removeLLMFromRoom", roomId, index)
    setLlms((prev) => prev.filter((_, i) => i !== index))
  }

  const getMessageClass = (msg) => {
    if (msg.user && msg.user.id === "system") return "text-blue-600"
    if (msg.user && msg.user.name?.startsWith("@")) return "text-green-600"
    return ""
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Room: {roomId}</h2>
        <div className="flex items-center gap-2">
          <span className={connected ? "text-green-600" : "text-red-600"}>
            {connected ? "Connected" : "Disconnected"}
          </span>
          {connected && socket ? (
            <Button variant="outline" size="sm" onClick={() => socket.disconnect()}>
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={getMessageClass(msg)}>
                <strong>{msg.user ? msg.user.name : "Unknown"}:</strong> {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={llmName}
              onChange={(e) => setLlmName(e.target.value)}
              placeholder="LLM Name"
            />
            <Button onClick={addLLM}>Add LLM</Button>
          </div>
          <ul className="space-y-1">
            {llms.map((llm, idx) => (
              <li key={idx} className="flex justify-between items-center">
                <span>{llm}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeLLM(idx)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
