import { NextResponse } from "next/server"

// In a real application, you'd use a database
const rooms = new Map()

export async function GET(request, { params }) {
  const roomId = params.roomId

  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: [],
      messages: [],
      createdAt: new Date(),
    })
  }

  return NextResponse.json(rooms.get(roomId))
}

export async function POST(request, { params }) {
  const roomId = params.roomId
  const { action, userName, message } = await request.json()

  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: [],
      messages: [],
      createdAt: new Date(),
    })
  }

  const room = rooms.get(roomId)

  switch (action) {
    case "join":
      if (!room.users.includes(userName)) {
        room.users.push(userName)
      }
      break
    case "leave":
      room.users = room.users.filter((user) => user !== userName)
      break
    case "message":
      room.messages.push({
        id: Date.now().toString(),
        userName,
        content: message,
        timestamp: new Date(),
      })
      break
  }

  return NextResponse.json({ success: true })
}
