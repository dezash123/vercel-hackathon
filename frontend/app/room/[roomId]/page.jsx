"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"
import { PromptTreeSidebar } from "@/components/prompt-tree-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { useChat } from "@ai-sdk/react"

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId
  const [userName, setUserName] = useState("")
  const [isNameSet, setIsNameSet] = useState(false)
  const [users, setUsers] = useState([])
  const [conversationTree, setConversationTree] = useState({
    id: "root",
    messages: [],
    children: [],
    title: "Main Conversation",
  })
  const [currentBranch, setCurrentBranch] = useState("root")

  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    api: "/api/chat",
    body: { roomId, userName },
  })

  const handleNameSubmit = (name) => {
    setUserName(name)
    setIsNameSet(true)
  }

  const createBranch = (fromMessageIndex) => {
    const branchId = `branch-${Date.now()}`
    const branchMessages = messages.slice(0, fromMessageIndex + 1)

    const newBranch = {
      id: branchId,
      messages: branchMessages,
      children: [],
      title: `Branch from message ${fromMessageIndex + 1}`,
    }

    setConversationTree((prev) => ({
      ...prev,
      children: [...prev.children, newBranch],
    }))

    setCurrentBranch(branchId)
    setMessages(branchMessages)
  }

  const switchToBranch = (branchId) => {
    setCurrentBranch(branchId)
    const findBranch = (node) => {
      if (node.id === branchId) return node
      for (const child of node.children) {
        const found = findBranch(child)
        if (found) return found
      }
      return null
    }

    const branch = findBranch(conversationTree)
    if (branch) {
      setMessages(branch.messages)
    }
  }

  if (!isNameSet) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full border">
            <h2 className="text-2xl font-bold mb-4 text-center">Join Room: {roomId}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const name = formData.get("name")
                if (name.trim()) handleNameSubmit(name.trim())
              }}
            >
              <input
                name="name"
                placeholder="Enter your name"
                className="w-full p-3 border rounded-lg mb-4 bg-background"
                required
              />
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90"
              >
                Join Chat
              </button>
            </form>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <div className="flex h-screen bg-background overflow-hidden">
          <ChatInterface
            roomId={roomId}
            userName={userName}
            users={users}
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            onCreateBranch={createBranch}
          />
          <PromptTreeSidebar
            conversationTree={conversationTree}
            currentBranch={currentBranch}
            onSwitchBranch={switchToBranch}
            onCreateBranch={createBranch}
          />
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}
