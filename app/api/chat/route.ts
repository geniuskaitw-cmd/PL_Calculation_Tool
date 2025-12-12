import { Configuration, OpenAIApi } from "openai-edge"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

// Allow streaming responses up to 30 seconds
export const runtime = "edge"
export const maxDuration = 30

// 定義 Function Calling 的工具
const functions = [
  // Phase 1: 讀取能力
  {
    name: "get_current_state",
    description: "獲取當前財務狀態總覽，以結構化 JSON 返回",
    parameters: {
      type: "object",
      properties: {
        detail_level: {
          type: "string",
          enum: ["summary", "detailed"],
          description: "summary=總覽指標, detailed=包含所有月份數據",
        },
      },
      required: ["detail_level"],
    },
  },
  // Phase 2: 完整 JSON 導入
  {
    name: "import_complete_plan",
    description: "導入完整的財務計畫 JSON，一次性設定所有月份數據和留存模型",
    parameters: {
      type: "object",
      properties: {
        plan: {
          type: "object",
          properties: {
            retention_model: {
              type: "string",
              enum: ["A", "B", "C", "D", "E", "F"],
              description: "留存模型 ID（A=SLG高, B=RPG, C=SLG低, D=休閒, E=超休閒, F=自定義）",
            },
            timeline: {
              type: "array",
              description: "月度計畫數據",
              items: {
                type: "object",
                properties: {
                  monthIndex: { type: "number", description: "月份索引（1=M1, 2=M2...）" },
                  nuu: { type: "number", description: "新增用戶數" },
                  marketing: { type: "number", description: "行銷預算（元）" },
                  arpdau: { type: "number", description: "每日活躍用戶平均收入（美金）" },
                  ecpa: { type: "number", description: "有效獲客成本（美金）" },
                },
                required: ["monthIndex", "nuu", "marketing", "arpdau"],
              },
            },
          },
          required: ["timeline"],
        },
      },
      required: ["plan"],
    },
  },
  // Phase 2: 批量操作優化
  {
    name: "update_multiple_months",
    description: "批量更新多個月份的參數，用於微調優化",
    parameters: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          description: "更新列表（可更新多個月份的多個欄位）",
          items: {
            type: "object",
            properties: {
              monthIndex: { type: "number" },
              updates: {
                type: "object",
                description: "該月要更新的欄位",
                properties: {
                  nuu: { type: "number" },
                  marketing: { type: "number" },
                  arpdau: { type: "number" },
                  ecpa: { type: "number" },
                },
              },
            },
            required: ["monthIndex", "updates"],
          },
        },
      },
      required: ["updates"],
    },
  },
  // 保留原有工具
  {
    name: "updateMonthlyPlan",
    description: "更新單一月份的單一欄位",
    parameters: {
      type: "object",
      properties: {
        monthIndex: {
          type: "number",
          description: "The index of the month (1 for M1, 2 for M2, etc.)",
        },
        field: {
          type: "string",
          enum: ["nuu", "marketing", "arpdau", "ecpa"],
          description: "The field to update",
        },
        value: {
          type: "number",
          description: "The new value",
        },
      },
      required: ["monthIndex", "field", "value"],
    },
  },
  {
    name: "updateRetention",
    description: "更新留存曲線錨點",
    parameters: {
      type: "object",
      properties: {
        day: {
          type: "number",
          description: "The day index (1, 3, 7, 14, 30, 60, 90, 180)",
        },
        value: {
          type: "number",
          description: "The retention rate value (0-100)",
        },
      },
      required: ["day", "value"],
    },
  },
  {
    name: "applyPreset",
    description: "套用預設留存模型",
    parameters: {
      type: "object",
      properties: {
        modelId: {
          type: "string",
          enum: ["A", "B", "C", "D", "E", "F"],
          description: "The ID of the model (A=SLG High, B=RPG, C=SLG Low, D=Casual, E=Hypercasual, F=Custom)",
        },
      },
      required: ["modelId"],
    },
  },
]

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

    console.log("🚀 Calling OpenAI API with Function Calling...")

    const response = await openai.createChatCompletion({
      model: "gpt-4o",  // 使用穩定版本
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...messages,
      ],
      functions,
      function_call: "auto",
      temperature: 0.1,  // 極低溫度，提高計算準確性
      max_tokens: 4000,
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