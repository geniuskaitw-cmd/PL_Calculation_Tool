import { Configuration, OpenAIApi } from "openai-edge"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

// Allow streaming responses up to 30 seconds
export const runtime = "edge"
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    console.log("🔵 API Route: Received request")
    console.log("📨 Messages:", JSON.stringify(messages, null, 2))

    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY not configured")
      return new Response("OpenAI API Key not configured", { status: 500 })
    }

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const openai = new OpenAIApi(configuration)

    console.log("🚀 Calling OpenAI API...")

    const response = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    })

    console.log("✅ OpenAI API call successful, starting stream...")

    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)
  } catch (error: any) {
    console.error("❌ API Route Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}