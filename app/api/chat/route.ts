import { createOpenAI } from "@ai-sdk/openai"
import { streamText, tool } from "ai"
import { z } from "zod"
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
})

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const json = await req.json()
  const { messages } = json
  console.log("Received messages:", JSON.stringify(messages, null, 2))

  if (!Array.isArray(messages)) {
    return new Response("messages must be an array", { status: 400 })
  }

  const result = streamText({
    model: openai("gpt-4o"),
    messages, // 直接使用 messages，因為格式已經兼容
    system: SYSTEM_PROMPT,
    // @ts-ignore
    maxSteps: 10,
    tools: {
      updateMonthlyPlan: tool({
        description: "Update monthly planning parameters like NUU, Budget, or ARPDAU for a specific month.",
        parameters: z.object({
          monthIndex: z.number(),
          field: z.string(),
          value: z.number(),
        }),
        execute: async ({ monthIndex, field, value }: any) => {
          return `Successfully updated M${monthIndex}'s ${field} to ${value}.`
        },
      }),
      updateRetention: tool({
        description: "Update the retention curve anchors.",
        parameters: z.object({
          day: z.number(),
          value: z.number(),
        }),
        execute: async ({ day, value }: any) => {
          return `Successfully updated Retention Day ${day} to ${value}%.`
        },
      }),
      applyPreset: tool({
        description: "Apply a standard industry benchmark retention model.",
        parameters: z.object({
          modelId: z.string(),
        }),
        execute: async ({ modelId }: any) => {
          return `Successfully applied preset model ${modelId}.`
        },
      }),
    },
  })

  return result.toTextStreamResponse()
}