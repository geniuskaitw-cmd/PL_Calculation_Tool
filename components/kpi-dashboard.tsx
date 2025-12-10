"use client"

import type React from "react"

import { useState, useRef } from "react"
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calculator,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Repeat,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useFinance, type ExportData } from "@/lib/finance-context"
import { calculateLTV, calculateNetLTV } from "@/lib/finance-utils"

interface KpiDashboardProps {
  title: string
  variant?: "business-plan" | "income-statement"
}

export function KpiDashboard({ title, variant = "business-plan" }: KpiDashboardProps) {
  const { plData, rrModel, settings, exportData, importData, removedItems } = useFinance()
  const [ltvDays, setLtvDays] = useState(90)
  const [roiMonths, setRoiMonths] = useState(12)
  const [editingLtv, setEditingLtv] = useState(false)
  const [editingRoi, setEditingRoi] = useState(false)
  const [ltvMode, setLtvMode] = useState<"gross" | "net">("gross")
  const [roiMode, setRoiMode] = useState<"full" | "marketing">("full")
  const [collapsed, setCollapsed] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const opsData = plData.filter((m) => !m.isDev)

  const calcRoi = () => {
    const monthsToCalc = Math.min(roiMonths, opsData.length)
    const slicedData = opsData.slice(0, monthsToCalc)

    let totalCost: number
    let totalRevenue: number
    
    if (roiMode === "marketing") { // ROAS
      totalCost = slicedData.reduce((acc, month) => acc + month.marketingCost, 0)
      totalRevenue = slicedData.reduce((acc, month) => acc + month.grossRevenue, 0)
      return totalCost > 0 ? `${((totalRevenue / totalCost) * 100).toFixed(2)}%` : "0%"
    } else { // ROI
      totalCost = slicedData.reduce((acc, month) => {
        const fullCost = month.marketingCost + month.channelFee + month.ipCost + month.cpCost + month.opeCost + month.fc
        return acc + fullCost
      }, 0)
      const totalProfit = slicedData.reduce((acc, month) => acc + month.profit, 0)
      return totalCost > 0 ? `${((totalProfit / totalCost) * 100).toFixed(2)}%` : "0%"
    }
  }

  const roi = calcRoi()

  const paybackIdx = opsData.findIndex((d) => d.accProfit > 0)
  const paybackMonths = paybackIdx >= 0 ? opsData[paybackIdx].monthLabel : "-"

  const maxRevenue = Math.max(...opsData.map((d) => d.grossRevenue), 0)
  const accProfit = opsData[opsData.length - 1]?.accProfit || 0

  const avgArpdau = opsData.length > 0 ? opsData.reduce((a, b) => a + b.arpdau, 0) / opsData.length : 0.15

  const totalShare = settings.platforms.ios.share + settings.platforms.android.share
  const avgChannelFeeRatio =
    totalShare > 0
      ? (settings.platforms.ios.fee * settings.platforms.ios.share +
          settings.platforms.android.fee * settings.platforms.android.share) /
        totalShare /
        100
      : 0.3

  const ltv =
    ltvMode === "gross"
      ? calculateLTV(rrModel, avgArpdau, ltvDays)
      : calculateNetLTV(rrModel, avgArpdau, avgChannelFeeRatio, ltvDays)

  const handleExportExcel = () => {
    let csvContent: string
    const BOM = "\uFEFF"

    if (variant === "business-plan") {
      const headers = ["月份", "導入策略", "預算模式", "NUU", "預算", "eCPA", "DAU", "ARPDAU", "REV"]
      const rows = opsData.map((d) => [
        d.monthLabel,
        d.strategy,
        d.calcMode,
        d.nuu,
        d.marketing,
        d.ecpa.toFixed(2),
        d.dau,
        d.arpdau.toFixed(2),
        Math.round(d.grossRevenue),
      ])
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    } else {
      const headers = ["月份", "NUU", "DAU", "ARPDAU", "總流水", "去稅流水", "CM1", "CM2", "利潤", "累計利潤"]
      const rows = plData.map((d) => [
        d.monthLabel,
        d.nuu,
        d.dau,
        d.arpdau.toFixed(2),
        Math.round(d.grossRevenue),
        Math.round(d.netSales),
        Math.round(d.cm1),
        Math.round(d.cm2),
        Math.round(d.profit),
        Math.round(d.accProfit),
      ])
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    }

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const fileName = variant === "business-plan" ? "BusinessPlan" : "PL_Report"
    link.download = `${fileName}_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleExportJSON = () => {
    const data = exportData()
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `PL_Config_${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJSON = () => {
    importInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ExportData
        if (data.version) {
          importData(data)
          alert("設定匯入成功！")
        } else {
          alert("JSON 格式錯誤")
        }
      } catch {
        alert("無法解析 JSON 檔案")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="bg-sidebar text-sidebar-foreground px-6 py-3">
      <input ref={importInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-lg font-medium hover:text-sidebar-foreground/80 transition-colors"
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {title}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-4">
            {/* LTV 卡片 */}
            <div
              className="bg-sidebar-accent rounded-lg px-5 py-2.5 cursor-pointer hover:bg-sidebar-accent/80 transition-colors"
              onClick={() => !editingLtv && setEditingLtv(true)}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm text-sidebar-foreground/80">
                  {editingLtv ? (
                    <span className="flex items-center gap-1">
                      LTV
                      <Input
                        type="number"
                        value={ltvDays}
                        onChange={(e) => setLtvDays(Number(e.target.value) || 90)}
                        onBlur={() => setEditingLtv(false)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingLtv(false)}
                        className="w-14 h-5 text-xs text-center inline-block bg-sidebar-foreground/10 border-none"
                        autoFocus
                      />
                      天
                    </span>
                  ) : (
                    `LTV${ltvDays}`
                  )}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLtvMode(ltvMode === "gross" ? "net" : "gross")
                  }}
                >
                  {ltvMode === "gross" ? "Gross" : "Net"}
                </Button>
                <Calculator className="w-3 h-3 text-sidebar-foreground/50" />
              </div>
              <p className="text-xl font-bold text-sidebar-foreground">${ltv.toFixed(2)}</p>
            </div>

            {/* ROI 卡片 */}
            <div
              className="bg-sidebar-accent rounded-lg px-5 py-2.5 cursor-pointer hover:bg-sidebar-accent/80 transition-colors"
              onClick={() => !editingRoi && setEditingRoi(true)}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm text-sidebar-foreground/80">
                  {editingRoi ? (
                    <span className="flex items-center gap-1">
                      ROI
                      <Input
                        type="number"
                        value={roiMonths}
                        onChange={(e) => setRoiMonths(Number(e.target.value) || 12)}
                        onBlur={() => setEditingRoi(false)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingRoi(false)}
                        className="w-10 h-5 text-xs text-center inline-block bg-sidebar-foreground/10 border-none"
                        autoFocus
                      />
                      月
                    </span>
                  ) : (
                    `${roiMode === 'full' ? 'ROI' : 'ROAS'} (${roiMonths}月)`
                  )}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRoiMode(roiMode === "full" ? "marketing" : "full")
                        }}
                      >
                        <Repeat className="w-3 h-3 text-sidebar-foreground/60" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>切換 ROI / ROAS 計算</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {variant === "income-statement" && <TrendingUp className="w-3 h-3 text-green-400" />}
              </div>
              <p className="text-xl font-bold text-white">{roi}</p>
            </div>

            {/* 回本月數 */}
            <div className="bg-sidebar-accent rounded-lg px-5 py-2.5">
              <p className="text-sm text-sidebar-foreground/80">N個月回本</p>
              <p className="text-xl font-bold text-sidebar-foreground">{paybackMonths}</p>
            </div>

            {/* 最高月流水 */}
            <div className="bg-sidebar-accent rounded-lg px-5 py-2.5 flex items-center gap-3">
              <div>
                <p className="text-sm text-sidebar-foreground/80">最高月流水</p>
                <p className="text-xl font-bold text-sidebar-foreground">${Math.round(maxRevenue).toLocaleString()}</p>
              </div>
              <BarChart3 className="w-5 h-5 text-sidebar-foreground/50" />
            </div>

            {/* 累積淨利 */}
            <div className="bg-sidebar-accent rounded-lg px-5 py-2.5 flex items-center gap-3">
              <div>
                <p className="text-sm text-sidebar-foreground/80">累積淨利</p>
                <p className={`text-xl font-bold ${accProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  ${Math.round(accProfit).toLocaleString()}
                </p>
              </div>
              <PieChart className="w-5 h-5 text-sidebar-primary" />
            </div>

            {/* 匯出匯入按鈕 */}
            <div className="flex items-center gap-2 ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExportExcel}
                      className="h-9 w-9 bg-sidebar-accent hover:bg-sidebar-accent/80"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>匯出 Excel (CSV)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExportPDF}
                      className="h-9 w-9 bg-sidebar-accent hover:bg-sidebar-accent/80"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>匯出 PDF (列印)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExportJSON}
                      className="h-9 w-9 bg-sidebar-accent hover:bg-sidebar-accent/80"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>匯出設定 (JSON)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleImportJSON}
                      className="h-9 w-9 bg-sidebar-accent hover:bg-sidebar-accent/80"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>匯入設定 (JSON)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
