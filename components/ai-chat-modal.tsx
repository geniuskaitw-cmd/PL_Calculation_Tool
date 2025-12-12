"use client"

import { useChat } from "ai/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Bot, Loader, Check } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useFinance } from "@/lib/finance-context"

interface AiChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiChatModal({ open, onOpenChange }: AiChatModalProps) {
  const { timeline, updateMonth, setRrModel, plData, rrModel, importData, exportData } = useFinance()
  const processedCalls = useRef(new Set<string>())

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    append,
  } = useChat({
    api: "/api/chat",
    onResponse: (response) => {
      console.log("🟢 收到後端回應:", response.status)
    },
    onFinish: (message) => {
      console.log("✅ AI 回應完成")
    },
    onError: (error) => {
      console.error("❌ Chat Error:", error)
      toast.error("AI 回應失敗: " + error.message)
    },
  })

  const handleFunctionCall = async (functionCall: any, messageId: string) => {
    // 防止重複處理
    if (processedCalls.current.has(messageId)) {
      return
    }
    processedCalls.current.add(messageId)

    const { name, arguments: args } = functionCall
    console.log("🔧 處理工具調用:", name, args)
    
    try {
      const parsedArgs = typeof args === "string" ? JSON.parse(args) : args
      let result = ""
      
      if (name === "get_current_state") {
        const { detail_level } = parsedArgs
        const opsMonths = plData.filter((m) => !m.isDev)
        const summary = {
          總月數: opsMonths.length,
          開發月數: timeline.filter((m) => m.isDev).length,
          累積利潤: plData[plData.length - 1]?.accProfit || 0,
          總預算: plData.reduce((sum, m) => sum + m.marketingCost, 0),
          總流水: plData.reduce((sum, m) => sum + m.grossRevenue, 0),
          平均ARPDAU:
            opsMonths.length > 0
              ? (opsMonths.reduce((sum, m) => sum + m.arpdau, 0) / opsMonths.length).toFixed(2)
              : 0,
          平均NUU:
            opsMonths.length > 0
              ? Math.round(opsMonths.reduce((sum, m) => sum + m.nuu, 0) / opsMonths.length)
              : 0,
          最終ROAS:
            plData.length > 0 && plData.reduce((sum, m) => sum + m.marketingCost, 0) > 0
              ? (
                  (plData.reduce((sum, m) => sum + m.grossRevenue, 0) /
                    plData.reduce((sum, m) => sum + m.marketingCost, 0)) *
                  100
                ).toFixed(1)
              : 0,
        }

        if (detail_level === "detailed") {
          const monthly = plData.map((m) => ({
            月份: m.monthLabel,
            月份索引: m.monthIndex,
            是否開發期: m.isDev,
            NUU: m.nuu,
            行銷預算: m.marketingCost,
            ARPDAU: m.arpdau,
            CPI: m.ecpa,
            DAU: m.dau,
            總流水: m.grossRevenue,
            月利潤: m.profit,
            累積利潤: m.accProfit,
          }))

          const retention = {
            模型: rrModel.interpolationMode === "smart_curvature" ? "智能曲率" : "線性對數",
            次留: rrModel.default || 0,
            七留: rrModel.default || 0,
            月留: rrModel.default || 0,
          }

          result = JSON.stringify({ summary, monthly, retention }, null, 2)
        } else {
          result = JSON.stringify({ summary }, null, 2)
        }
      } else if (name === "import_complete_plan") {
        const { plan } = parsedArgs
        try {
          console.log(`🚀 開始導入完整計畫...`)
          
          // 獲取當前導出數據作為基礎
          const currentData = exportData()
          
          // Step 1: 計算所需月數並構建 timelineConfig
          const maxMonthIndex = Math.max(...plan.timeline.map((m: any) => m.monthIndex))
          const minMonthIndex = Math.min(...plan.timeline.map((m: any) => m.monthIndex))
          const devStart = minMonthIndex < 0 ? Math.abs(minMonthIndex) : 0
          const opsEnd = maxMonthIndex
          
          console.log(`📊 計畫範圍: M${minMonthIndex} ~ M${maxMonthIndex}`)
          console.log(`📐 配置: devStart=${devStart}, opsEnd=${opsEnd}`)
          
          // Step 2: 使用 generateTimeline 創建新的 timeline 結構
          const { generateTimeline } = await import("@/lib/finance-utils")
          const newTimeline = generateTimeline(devStart, opsEnd)
          
          // Step 3: 填入 AI 生成的數據
          plan.timeline.forEach((monthData: any) => {
            const targetMonth = newTimeline.find((m) => m.monthIndex === monthData.monthIndex)
            if (targetMonth && !targetMonth.isDev) {
              if (monthData.nuu !== undefined) targetMonth.nuu = monthData.nuu
              if (monthData.marketing !== undefined) targetMonth.marketing = monthData.marketing
              if (monthData.arpdau !== undefined) targetMonth.arpdau = monthData.arpdau
              if (monthData.ecpa !== undefined) targetMonth.ecpa = monthData.ecpa
            }
          })
          
          // Step 4: 套用留存模型
          let rrModel = currentData.rrModel
          if (plan.retention_model) {
            console.log(`🔧 載入留存模型: ${plan.retention_model}`)
            const modelData = await fetch(`/models/${plan.retention_model}.json`).then((r) => r.json())
            const retentionData = modelData.retention || modelData.anchors || {}
            rrModel = {
              ...currentData.rrModel,
              default: retentionData,
            }
            console.log(`✅ 留存模型已載入，錨點數量: ${Object.keys(retentionData).length}`)
          }
          
          // Step 5: 使用 importData 一次性導入所有數據
          const importPayload = {
            ...currentData,
            timelineConfig: { devStart, opsEnd },
            timeline: newTimeline,
            rrModel,
          }
          
          console.log(`📥 執行 importData...`)
          importData(importPayload)
          
          result = `✅ 成功導入完整計畫！\n📊 共 ${plan.timeline.length} 個月\n🎯 留存模型: ${plan.retention_model || "預設"}`
          toast.success(result, { duration: 3000 })
        } catch (err: any) {
          console.error(`❌ 導入失敗:`, err)
          result = `導入失敗: ${err.message}`
          toast.error(result)
        }
      } else if (name === "update_multiple_months") {
        const { updates } = parsedArgs
        let successCount = 0
        let failCount = 0
        updates.forEach((item: any) => {
          const { monthIndex, updates: monthUpdates } = item
          const targetMonth = timeline.find((m) => m.monthIndex === monthIndex)
          if (targetMonth) {
            Object.keys(monthUpdates).forEach((field) => {
              updateMonth(targetMonth.id, field, monthUpdates[field])
            })
            successCount++
          } else {
            failCount++
          }
        })
        result = `批量更新完成: 成功 ${successCount} 個月, 失敗 ${failCount} 個月`
        toast.success(result)
      } else if (name === "updateMonthlyPlan") {
        const { monthIndex, field, value } = parsedArgs
        const targetMonth = timeline.find((m) => m.monthIndex === monthIndex)

        if (targetMonth) {
          console.log(`🔧 執行: updateMonth(${targetMonth.id}, ${field}, ${value})`)
          updateMonth(targetMonth.id, field, value)
          result = `成功更新 M${monthIndex} 的 ${field} 為 ${value}`
          toast.success(`✅ ${result}`)
        } else {
          result = `找不到月份 M${monthIndex}`
          toast.error(`❌ ${result}`)
        }
      } else if (name === "updateRetention") {
        const { day, value } = parsedArgs
        console.log(`🔧 執行: updateRetention(${day}, ${value})`)
        setRrModel((prev) => ({
          ...prev,
          default: { ...prev.default, [day]: value },
        }))
        result = `成功更新 RR Day ${day} 為 ${value}%`
        toast.success(`✅ ${result}`)
      } else if (name === "applyPreset") {
        const { modelId } = parsedArgs
        console.log(`🔧 執行: applyPreset(${modelId})`)
        await fetch(`/models/${modelId}.json`)
          .then((res) => res.json())
          .then((data) => {
            const retentionData = data.retention || data.anchors || {}
            console.log(`📊 套用模型 ${modelId} 留存數據:`, retentionData)
            setRrModel((prev) => ({
              ...prev,
              default: retentionData,
            }))
            result = `成功套用預設模型 ${modelId}`
            toast.success(`✅ ${result}`)
          })
          .catch((err) => {
            result = `載入模型失敗: ${err.message}`
            toast.error(`❌ ${result}`)
          })
      }

      // 延遲一下，讓 UI 更新完成，然後添加確認消息
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => {
            // 移除 function_call 的消息
            try {
              const parsed = JSON.parse(m.content)
              return !parsed.function_call
            } catch {
              return true
            }
          }),
          {
            id: `result-${Date.now()}`,
            role: "assistant",
            content: `✅ 已完成！${result}`,
          },
        ])
      }, 100)
    } catch (err: any) {
      console.error("❌ 工具執行錯誤:", err)
      toast.error(`❌ 執行工具失敗: ${err.message}`)
    }
  }

  // 監聽 messages 變化，檢查是否有新的 function_call
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1] as any
      
      // 檢查 content 是否包含 function_call JSON
      if (lastMessage.content && lastMessage.role === "assistant") {
        // 尋找 JSON 結構
        const jsonMatch = lastMessage.content.match(/{[\s\S]*}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch)
            if (parsed.function_call) {
              console.log("🎯 在 content 中發現 function_call (混合內容)")
              handleFunctionCall(parsed.function_call, lastMessage.id)
              // 更新消息內容，移除 JSON 部分
              const newMessageContent = lastMessage.content.replace(jsonMatch, "").trim()
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === lastMessage.id ? { ...msg, content: newMessageContent } : msg,
                ),
              )
            }
          } catch (e) {
            // 可能是無效的 JSON，嘗試全量解析
            try {
              const parsed = JSON.parse(lastMessage.content)
              if (parsed.function_call) {
                console.log("🎯 在 content 中發現 function_call (純JSON)")
                handleFunctionCall(parsed.function_call, lastMessage.id)
              }
            } catch (e2) {
              // 忽略
            }
          }
        }
      }
      
      // 直接檢查是否有 function_call 屬性
      if (lastMessage.function_call) {
        console.log("🎯 在 message 上發現 function_call")
        handleFunctionCall(lastMessage.function_call, lastMessage.id)
      }
    }
  }, [messages])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "initial",
          role: "assistant",
          content: "您好！我是您的 AI 財務規劃助理 🤖\n\n**我可以幫您：**\n✅ 自動填寫表格參數\n✅ 調整留存曲線\n✅ 套用行業基準模型\n✅ 規劃財務目標\n\n**試試看：**\n• 「請幫我把 M1 的預算設為 100 萬」\n• 「將 M2 的 NUU 改成 10000」\n• 「我是 RPG 遊戲，24 個月預算 3000 萬，想賺 800 萬淨利」",
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
            AI 財務助手
          </DialogTitle>
          <DialogDescription>告訴我您的目標，我會自動幫您填寫表格</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages
            .filter((m) => {
              // 過濾掉純 function_call 的消息
              try {
                const parsed = JSON.parse(m.content)
                return !parsed.function_call
              } catch {
                return true
              }
            })
            .map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : m.content.startsWith("✅")
                        ? "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span>AI 正在思考並調整參數...</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 pt-4 border-t">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "AI 正在思考..." : "輸入您的需求..."}
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
