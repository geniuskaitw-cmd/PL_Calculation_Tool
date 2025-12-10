"use client"

import { useChat } from "@ai-sdk/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Bot, Loader } from "lucide-react"
import { useFinance } from "@/lib/finance-context"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface AiChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiChatModal({ open, onOpenChange }: AiChatModalProps) {
  const { timeline, updateMonth, setRrModel } = useFinance()
  const processedToolCalls = useRef(new Set<string>())
  const [input, setInput] = useState("")

  // AI SDK v5 的類型定義與實際 API 不匹配，使用 any 繞過類型檢查
  const chatHelpers = useChat({
    api: "/api/chat",
    onToolCall: async ({ toolCall }: any) => {
      const toolCallId = toolCall.toolCallId

      if (processedToolCalls.current.has(toolCallId)) {
        return
      }

      if (toolCall.toolName === "updateMonthlyPlan") {
        const { monthIndex, field, value } = toolCall.args
        const targetMonth = timeline.find((m: any) => m.monthIndex === monthIndex)
        if (targetMonth) {
          updateMonth(targetMonth.id, field, value)
          toast.success(`AI 已更新 M${monthIndex} 的 ${field} 為 ${value}`)
        }
      } else if (toolCall.toolName === "updateRetention") {
        const { day, value } = toolCall.args
        setRrModel((prev: any) => ({ ...prev, default: { ...prev.default, [day]: value } }))
        toast.success(`AI 已更新 RR Day ${day} 為 ${value}%`)
      } else if (toolCall.toolName === "applyPreset") {
        const { modelId } = toolCall.args
        toast.success(`AI 已套用預設模型 ${modelId}`)
      }

      processedToolCalls.current.add(toolCallId)
    },
  } as any)

  const { messages, append, status, setMessages } = chatHelpers as any

  useEffect(() => {
    if (open && messages?.length === 0) {
      setMessages([
        {
          id: "initial",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "您好！我是您的財務規劃助理。您可以直接告訴我目標（例如：'2年內淨利400萬'），或請我修改特定欄位（例如：'把 M1 的預算設為 500,000'）。",
            },
          ],
        },
      ])
    }
  }, [open, messages?.length, setMessages])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (input.trim() && status !== "streaming") {
      append({ role: "user", content: input })
      setInput("")
    }
  }

  const isLoading = status === "streaming"

  // 從消息中提取文本內容
  const getMessageContent = (message: any): string => {
    if (typeof message.content === "string") {
      return message.content
    }
    if (Array.isArray(message.parts)) {
      return message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("")
    }
    return ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI 助手
          </DialogTitle>
          <DialogDescription>與 AI 對話來分析您的財務數據</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages
            .filter((m: any) => m.role !== "tool")
            .map((m: any) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {getMessageContent(m)}
                </div>
              </div>
            ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 pt-4 border-t">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "AI 正在思考..." : "輸入訊息..."}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
