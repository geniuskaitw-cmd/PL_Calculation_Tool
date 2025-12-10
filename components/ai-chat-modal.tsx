"use client"

import { useChat } from "ai/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Bot, Loader } from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"

interface AiChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiChatModal({ open, onOpenChange }: AiChatModalProps) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: "/api/chat",
    onResponse: (response) => {
      console.log("🟢 收到後端回應:", response.status)
    },
    onFinish: (message) => {
      console.log("✅ AI 回應完成:", message.content)
    },
    onError: (error) => {
      console.error("❌ Chat Error:", error)
      toast.error("AI 回應失敗: " + error.message)
    },
  })

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "initial",
          role: "assistant",
          content: "您好！我是您的財務規劃助理。您可以問我任何問題，例如：「分析一下目前的財務狀況」或「幫我規劃達成淨利 400 萬的策略」。",
        },
      ])
    }
  }, [open, messages.length, setMessages])

  useEffect(() => {
    if (error) {
      console.error("❌ useChat Error:", error)
    }
  }, [error])

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
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
                <Loader className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 pt-4 border-t">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "AI 正在思考..." : "輸入訊息..."}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
