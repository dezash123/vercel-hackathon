"use client"


import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Send, Bot, User, Users, GitBranch } from "lucide-react"
// eslint-disable-next-line no-unused-vars
import { useSidebar } from "@/components/ui/sidebar"


const AI_MODELS = [
  { name: "gpt4", label: "GPT-4", color: "bg-green-500" },
  { name: "claude", label: "Claude", color: "bg-purple-500" },
  { name: "gemini", label: "Gemini", color: "bg-blue-500" },
]

export function ChatInterface({
  roomId,
  userName,
  users,
  messages,
  input,
  handleInputChange,
  handleSubmit,
  onCreateBranch,
}) {
  const [selectedAI, setSelectedAI] = useState(null)
  const [showAISelector, setShowAISelector] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { state } = useSidebar()
  const isSidebarCollapsed = state === "collapsed"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleInputKeyDown = (e) => {
    if (e.key === "@") {
      setShowAISelector(true)
    } else if (e.key === "Escape") {
      setShowAISelector(false)
      setSelectedAI(null)
    }
  }

  const selectAI = (aiName) => {
    setSelectedAI(aiName)
    setShowAISelector(false)
    const newValue = input.replace(/@$/, `@${aiName} `)
    handleInputChange({ target: { value: newValue } })
    inputRef.current?.focus()
  }

  const isAIPrompt = (message) => {
    return message.includes("/ai") || message.startsWith("@") || message.includes("#share")
  }

  const getMessageType = (message) => {
    if (message.role === "assistant") return "ai"
    if (isAIPrompt(message.content)) return "prompt"
    return "user"
  }

  const getAIFromMessage = (content) => {
    const match = content.match(/@(\w+)/)
    return match ? match[1] : null
  }

  return (
    <div
      className={`flex flex-col h-screen transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "w-full" : "w-[calc(100%-20rem)]"
      }`}
    >
      {/* Header */}
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">Room: {roomId}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{users.length} users online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {AI_MODELS.map((ai) => (
              <Badge key={ai.name} className={`${ai.color} text-white`}>
                {ai.label}
              </Badge>
            ))}
          </div>
          <ThemeToggle />
          <SidebarTrigger />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const messageType = getMessageType(message)
          const aiName = getAIFromMessage(message.content)

          return (
            <div key={message.id} className="group relative">
              <div
                className={`flex items-start gap-3 ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    messageType === "ai"
                      ? "bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800"
                      : messageType === "prompt"
                        ? "bg-yellow-100 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800"
                        : message.role === "user"
                          ? "bg-muted border"
                          : "bg-card border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.role === "assistant" ? (
                      <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {message.role === "assistant" ? aiName || "AI" : userName}
                    </span>
                    {messageType === "prompt" && (
                      <Badge variant="outline" className="text-xs">
                        AI Prompt
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>

              {/* Branch button */}
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onCreateBranch(index)}
              >
                <GitBranch className="w-4 h-4" />
              </Button>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Selector */}
      {showAISelector && (
        <div className="absolute bottom-20 left-4 bg-popover border rounded-lg shadow-lg p-2">
          {AI_MODELS.map((ai) => (
            <button
              key={ai.name}
              onClick={() => selectAI(ai.name)}
              className="block w-full text-left px-3 py-2 hover:bg-accent rounded"
            >
              <span className={`inline-block w-3 h-3 rounded-full ${ai.color} mr-2`} />
              {ai.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-card border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a message... Use @ai to mention AI, /ai to mark as prompt, #share to share with other AIs"
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <div className="text-xs text-muted-foreground mt-2">
          <strong>Commands:</strong> @ai (mention AI) • /ai (mark as AI prompt) • #share (share with other AIs) • Ctrl+B
          (create branch)
        </div>
      </div>
    </div>
  )
}
