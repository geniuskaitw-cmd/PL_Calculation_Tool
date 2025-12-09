"use client"

import { useState } from "react"
import { BusinessPlanTab } from "@/components/business-plan-tab"
import { IncomeStatementTab } from "@/components/income-statement-tab"
import { KpiDashboard } from "@/components/kpi-dashboard"
import { SettingsModal } from "@/components/settings-modal"
import { AiChatModal } from "@/components/ai-chat-modal"
import { FinanceProvider } from "@/lib/finance-context"
import { FileText, Settings, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<"business-plan" | "income-statement">("business-plan")
  const [showSettings, setShowSettings] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h1 className="text-2xl font-bold">P&L Estimation Tool</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="gap-2 bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80"
            >
              <Settings className="w-4 h-4" />
              參數設定
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAiChat(true)}
                    className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80"
                  >
                    <Bot className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI 助手 (即將推出)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Tabs - 經營計劃改為營運預估 */}
        <nav className="flex gap-6 mt-4">
          <button
            onClick={() => setActiveTab("business-plan")}
            className={`pb-2 border-b-2 transition-colors text-xl font-medium ${
              activeTab === "business-plan"
                ? "border-sidebar-primary text-sidebar-primary"
                : "border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground"
            }`}
          >
            營運預估
          </button>
          <button
            onClick={() => setActiveTab("income-statement")}
            className={`pb-2 border-b-2 transition-colors text-xl font-medium ${
              activeTab === "income-statement"
                ? "border-sidebar-primary text-sidebar-primary"
                : "border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground"
            }`}
          >
            損益表
          </button>
        </nav>
      </header>

      <main className="flex-1 p-6 pb-32 overflow-auto">
        {activeTab === "business-plan" ? <BusinessPlanTab /> : <IncomeStatementTab />}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <KpiDashboard title="核心摘要" variant={activeTab} />
      </div>

      {/* Settings Modal */}
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />

      <AiChatModal open={showAiChat} onOpenChange={setShowAiChat} />
    </div>
  )
}

export default function Page() {
  return (
    <FinanceProvider>
      <FinanceDashboard />
    </FinanceProvider>
  )
}
