"use client"

import type React from "react"
import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import {
  type MonthlyData,
  type GlobalSettings,
  type RrModel,
  type CustomCostItem,
  type PLData,
  type TimelineConfig,
  type RemovableItemType,
  RR_DAYS,
} from "./finance-types"
import { generateTimeline, calculateMetrics, calculatePLData } from "./finance-utils"

export interface ExportData {
  version: string
  exportedAt: string
  timelineConfig: TimelineConfig
  timeline: MonthlyData[]
  settings: GlobalSettings
  rrModel: RrModel
  customCostItems: CustomCostItem[]
  removedItems: RemovableItemType[]
}

interface FinanceContextType {
  // State
  timeline: MonthlyData[]
  timelineConfig: TimelineConfig
  settings: GlobalSettings
  rrModel: RrModel
  customCostItems: CustomCostItem[]
  editingMonthIdx: number | null
  removedItems: RemovableItemType[]

  // Calculated data
  calculatedMetrics: (MonthlyData & { dau: number; grossRevenue: number })[]
  plData: PLData[]

  // Actions
  setTimeline: React.Dispatch<React.SetStateAction<MonthlyData[]>>
  setTimelineConfig: React.Dispatch<React.SetStateAction<TimelineConfig>>
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>
  setRrModel: React.Dispatch<React.SetStateAction<RrModel>>
  setCustomCostItems: React.Dispatch<React.SetStateAction<CustomCostItem[]>>
  setEditingMonthIdx: React.Dispatch<React.SetStateAction<number | null>>
  setRemovedItems: React.Dispatch<React.SetStateAction<RemovableItemType[]>>
  updateMonth: (id: string, field: string, val: number | string | number[]) => void
  handleTimelineResize: () => void
  exportData: () => ExportData
  importData: (data: ExportData) => void
}

const FinanceContext = createContext<FinanceContextType | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>({ devStart: 0, opsEnd: 12 })
  const [timeline, setTimeline] = useState<MonthlyData[]>(() => generateTimeline(0, 12))
  const [editingMonthIdx, setEditingMonthIdx] = useState<number | null>(null)
  const [removedItems, setRemovedItems] = useState<RemovableItemType[]>([])

  const [settings, setSettings] = useState<GlobalSettings>({
    taxRate: 5,
    refundRate: 0.1,
    ipRoyalty: 0,
    cpRoyalty: 0,
    opeRoyalty: 0,
    laborUnitCost: 200000, // 人力單價預設 200000
    serverCostRatio: 2,
    useServerRatio: true,
    platforms: {
      ios: { share: 60, fee: 33 }, // iOS 60%，渠道費 33%
      android: { share: 40, fee: 33 }, // 安卓 40%，渠道費 33%
      official: { share: 0, fee: 0 }, // 官網都是 0
    },
  })

  const [rrModel, setRrModel] = useState<RrModel>(() => {
    const empty: Record<number, number> = {}
    RR_DAYS.forEach((d) => (empty[d] = 0))
    return {
      default: { ...empty },
      overrides: {},
      interpolationMode: "linear_log",
    }
  })

  const [customCostItems, setCustomCostItems] = useState<CustomCostItem[]>([])

  const handleTimelineResize = () => {
    if (timelineConfig.devStart < 0 || timelineConfig.opsEnd < 1) {
      alert("月份設定無效")
      return
    }
    const newTimeline = generateTimeline(timelineConfig.devStart, timelineConfig.opsEnd, timeline)
    setTimeline(newTimeline)
  }

  const updateMonth = (id: string, field: string, val: number | string | number[]) => {
    setTimeline((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row

        const newRow: MonthlyData = { ...row }

        if (field.startsWith("custom_")) {
          const costId = field.replace("custom_", "")
          newRow.customCosts = { ...newRow.customCosts, [costId]: val as number }
        } else {
          ;(newRow as Record<string, unknown>)[field] = val
        }

        if (!newRow.isDev) {
          if (newRow.calcMode === "Fix_Budget_NUU" && field !== "ecpa") {
            newRow.ecpa = newRow.nuu > 0 ? Number.parseFloat((newRow.marketing / newRow.nuu).toFixed(2)) : 0
          }
          if (newRow.calcMode === "Fix_CPA_NUU" && field !== "marketing") {
            newRow.marketing = Math.round(newRow.nuu * newRow.ecpa)
          }
          if (newRow.calcMode === "Fix_Budget_CPA" && field !== "nuu") {
            newRow.nuu = newRow.ecpa > 0 ? Math.round(newRow.marketing / newRow.ecpa) : 0
          }
        }

        return newRow
      }),
    )
  }

  const calculatedMetrics = useMemo(() => {
    return calculateMetrics(timeline, rrModel)
  }, [timeline, rrModel])

  const plData = useMemo(() => {
    return calculatePLData(calculatedMetrics, settings, customCostItems, removedItems)
  }, [calculatedMetrics, settings, customCostItems, removedItems])

  const exportData = (): ExportData => {
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      timelineConfig,
      timeline,
      settings,
      rrModel,
      customCostItems,
      removedItems,
    }
  }

  const importData = (data: ExportData) => {
    if (data.timelineConfig) setTimelineConfig(data.timelineConfig)
    if (data.timeline) setTimeline(data.timeline)
    if (data.settings) setSettings(data.settings)
    if (data.rrModel) setRrModel(data.rrModel)
    if (data.customCostItems) setCustomCostItems(data.customCostItems)
    if (data.removedItems) setRemovedItems(data.removedItems)
  }

  return (
    <FinanceContext.Provider
      value={{
        timeline,
        timelineConfig,
        settings,
        rrModel,
        customCostItems,
        editingMonthIdx,
        removedItems,
        calculatedMetrics,
        plData,
        setTimeline,
        setTimelineConfig,
        setSettings,
        setRrModel,
        setCustomCostItems,
        setEditingMonthIdx,
        setRemovedItems,
        updateMonth,
        handleTimelineResize,
        exportData,
        importData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }
  return context
}
