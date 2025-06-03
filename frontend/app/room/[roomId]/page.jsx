"use client"
import { useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { SocketChat } from "@/components/socket-chat"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId
  const initialName = searchParams.get("name") || ""
  const [userName, setUserName] = useState(initialName)
  const [isNameSet, setIsNameSet] = useState(Boolean(initialName))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (userName.trim()) {
      setIsNameSet(true)
    }
  }

  if (!isNameSet) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Join Room: {roomId}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  required
                />
                <Button type="submit" className="w-full">
                  Join Chat
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen p-4 bg-background">
        <SocketChat roomId={roomId} userName={userName} />
      </div>
    </ThemeProvider>
  )
}
