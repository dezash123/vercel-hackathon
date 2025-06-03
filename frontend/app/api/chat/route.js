import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { streamText } from "ai"

export const maxDuration = 30

const AI_MODELS = {
  gpt4: openai("gpt-4-turbo"),
  claude: anthropic("claude-3-sonnet-20240229"),
  gemini: google("gemini-pro"),
}

export async function POST(req) {
  try {
    const { messages, roomId, userName } = await req.json()

    // Parse the last message to determine AI target and commands
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage.content

    // Check for AI mention (@ainame)
    const aiMention = content.match(/@(\w+)/)
    const targetAI = aiMention ? aiMention[1] : "gpt4"

    // Check for share command (#share)
    const shouldShare = content.includes("#share")

    // Clean the message content
    const cleanContent = content
      .replace(/@\w+\s*/, "")
      .replace(/#share\s*/, "")
      .trim()

    // Prepare messages for AI
    const aiMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.role === "user" ? cleanContent : msg.content,
    }))

    // Add system message for context
    const systemMessage = {
      role: "system",
      content: `You are ${targetAI.toUpperCase()} in a collaborative chat room "${roomId}". 
                User "${userName}" is asking you a question. 
                Be helpful and concise. If this message should be shared with other AIs, 
                mention that in your response.`,
    }

    const model = AI_MODELS[targetAI] || AI_MODELS.gpt4

    const result = streamText({
      model,
      messages: [systemMessage, ...aiMessages],
      temperature: 0.7,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
