'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [step, setStep] = useState('options')

  const startCreate = () => {
    const code = Math.random().toString(36).slice(2, 10)
    setRoomCode(code)
    setStep('name')
  }

  const startJoin = (e) => {
    e.preventDefault()
    if (joinCode.trim()) {
      setRoomCode(joinCode.trim())
      setStep('name')
    }
  }

  const handleNameSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      router.push(`/room/${roomCode}?name=${encodeURIComponent(name.trim())}`)
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {step === 'name' ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Enter your name</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md space-y-6">
            <CardHeader>
              <CardTitle className="text-center">MindMeld</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={startCreate}>
                Create Room
              </Button>
              <form onSubmit={startJoin} className="space-y-4">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Join code"
                  required
                />
                <Button type="submit" className="w-full">
                  Join Room
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </ThemeProvider>
  )
}
