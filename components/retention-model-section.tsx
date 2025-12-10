"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Wand2, Eraser, ArrowDownToLine, FolderOpen, Activity, Spline } from "lucide-react"
import { useFinance } from "@/lib/finance-context"
import { RR_DAYS } from "@/lib/finance-types"
import { interpolateRR } from "@/lib/finance-utils"
import { CollapsibleCard } from "./collapsible-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "sonner"

const MODEL_PRESETS = [
  { id: "A", name: "A型 - RPG高標", color: "#22c55e", description: "RPG遊戲高留存基準,適合優質RPG產品" },
  { id: "B", name: "B型 - 一般RPG", color: "#3b82f6", description: "RPG遊戲平均留存水準,通用RPG參考" },
  { id: "C", name: "C型 - RPG低標", color: "#f59e0b", description: "RPG遊戲低留存基準,保守估計用" },
  { id: "D", name: "D型 - Royal Match", color: "#ef4444", description: "三消遊戲代表,中度休閒遊戲參考" },
  { id: "E", name: "E型 - 地鐵跑酷", color: "#8b5cf6", description: "跑酷遊戲代表,快節奏遊戲參考" },
  { id: "F", name: "F型 - Coin Master", color: "#06b6d4", description: "社交博弈遊戲,長期運營參考" },
]

export function RetentionModelSection() {
  const { timeline, rrModel, setRrModel, editingMonthIdx, setEditingMonthIdx } = useFinance()
  const [collapsed, setCollapsed] = useState(true)
  const [inputValues, setInputValues] = useState<Record<number, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInterpolate = () => {
    const error = interpolateRR(rrModel, editingMonthIdx, setRrModel)
    if (error) alert(error)
  }

  const handleApplyPreset = async (modelId: string) => {
    try {
      const res = await fetch(`/models/${modelId}.json`)
      if (!res.ok) throw new Error(`Failed to load model ${modelId}`)
      
      const json = await res.json()
      
      // 驗證並轉換 JSON 數據
      const newCurve: Record<number, number> = {}
      if (json.retention && typeof json.retention === "object") {
        RR_DAYS.forEach((d) => {
          newCurve[d] = json.retention[d.toString()] || 0
        })
      } else {
        throw new Error("Invalid model format")
      }

      if (editingMonthIdx === null) {
        setRrModel((p) => ({ ...p, default: newCurve }))
      } else {
        setRrModel((p) => ({
          ...p,
          overrides: { ...p.overrides, [editingMonthIdx]: newCurve },
        }))
      }
      setInputValues({})
      toast.success(`已套用 ${json.name} 模型`)
    } catch (error) {
      console.error("Error applying preset:", error)
      toast.error("套用模型時發生錯誤")
    }
  }

  const handleClear = () => {
    if (!confirm("確定清空?")) return
    const empty: Record<number, number> = {}
    RR_DAYS.forEach((d) => (empty[d] = 0))

    if (editingMonthIdx === null) {
      setRrModel((p) => ({ ...p, default: empty }))
    } else {
      setRrModel((p) => {
        const o = { ...p.overrides }
        delete o[editingMonthIdx]
        return { ...p, overrides: o }
      })
    }
    setInputValues({})
  }

  const handleFillDown = () => {
    if (editingMonthIdx === null) {
      alert("請先選擇一個月份的特別設定才能向下填滿")
      return
    }
    const currentCurve = rrModel.overrides[editingMonthIdx] || rrModel.default
    const opsMonths = timeline.filter((m) => !m.isDev && m.monthIndex > editingMonthIdx)

    setRrModel((p) => {
      const newOverrides = { ...p.overrides }
      opsMonths.forEach((m) => {
        newOverrides[m.monthIndex] = { ...currentCurve }
      })
      return { ...p, overrides: newOverrides }
    })
  }

  const handleLoadTemplate = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json.retention && typeof json.retention === "object") {
          const newCurve: Record<number, number> = {}
          RR_DAYS.forEach((d) => {
            newCurve[d] = json.retention[d] || 0
          })

          if (editingMonthIdx === null) {
            setRrModel((p) => ({ ...p, default: newCurve }))
          } else {
            setRrModel((p) => ({
              ...p,
              overrides: { ...p.overrides, [editingMonthIdx]: newCurve },
            }))
          }
          setInputValues({})
          alert("模板載入成功！")
        } else {
          alert("JSON 格式錯誤，請確認包含 retention 物件")
        }
      } catch {
        alert("無法解析 JSON 檔案")
      }
    }
    reader.readAsText(file)
    e.target.value = "" // 重置以允許再次選擇同一檔案
  }

  const handleInputChange = (day: number, inputValue: string) => {
    setInputValues((prev) => ({ ...prev, [day]: inputValue }))
  }

  const handleInputBlur = (day: number) => {
    const inputValue = inputValues[day]
    if (inputValue === undefined) return

    let finalValue = 0
    if (inputValue !== "" && inputValue !== ".") {
      const parsed = Number.parseFloat(inputValue)
      if (!Number.isNaN(parsed)) {
        finalValue = parsed
      }
    }

    if (editingMonthIdx === null) {
      setRrModel((p) => ({ ...p, default: { ...p.default, [day]: finalValue } }))
    } else {
      setRrModel((p) => ({
        ...p,
        overrides: {
          ...p.overrides,
          [editingMonthIdx]: { ...(p.overrides[editingMonthIdx] || p.default), [day]: finalValue },
        },
      }))
    }

    setInputValues((prev) => {
      const newValues = { ...prev }
      delete newValues[day]
      return newValues
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, day: number) => {
    if (e.key === "Enter") {
      handleInputBlur(day)
      ;(e.target as HTMLInputElement).blur()
    }
  }

  const currentCurve =
    editingMonthIdx === null ? rrModel.default : rrModel.overrides[editingMonthIdx] || rrModel.default

  const getDisplayValue = (day: number) => {
    if (inputValues[day] !== undefined) {
      return inputValues[day]
    }
    return currentCurve[day] === 0 ? "" : currentCurve[day].toString()
  }

  return (
    <CollapsibleCard title="留存模型設定" collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        aria-label="載入留存模板"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={editingMonthIdx === null ? "global" : editingMonthIdx.toString()}
          onValueChange={(v) => {
            setEditingMonthIdx(v === "global" ? null : Number.parseInt(v))
            setInputValues({})
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">全域設定</SelectItem>
            {timeline
              .filter((m) => !m.isDev)
              .map((m) => (
                <SelectItem key={m.id} value={m.monthIndex.toString()}>
                  {m.monthLabel} 特別設定
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="bg-transparent">
              <FolderOpen className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>選擇基準模型</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MODEL_PRESETS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onSelect={(e) => {
                  e.preventDefault()
                  handleApplyPreset(model.id)
                }}
                className="flex flex-col items-start py-2"
              >
                <div className="font-medium" style={{ color: model.color }}>
                  {model.name}
                </div>
                <div className="text-xs text-muted-foreground">{model.description}</div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLoadTemplate}>
              <FolderOpen className="w-4 h-4 mr-2" />
              載入自訂 JSON...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center border rounded-md h-9 px-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroup
                  type="single"
                  value={rrModel.interpolationMode}
                  onValueChange={(v) => {
                    if (v) setRrModel((p) => ({ ...p, interpolationMode: v as any }))
                  }}
                  className="gap-0"
                >
                  <ToggleGroupItem
                    value="linear_log"
                    size="sm"
                    className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <Activity className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="smart_curvature"
                    size="sm"
                    className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <Spline className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span className="font-semibold">線性/對數</span>
                    <span className="text-xs text-muted-foreground">傳統的兩點間對數插值</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Spline className="w-4 h-4" />
                    <span className="font-semibold">智能曲率</span>
                    <span className="text-xs text-muted-foreground">參考行業基準曲線形狀進行補間</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleInterpolate} className="bg-transparent">
                <Wand2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>手動補間 (填入中間值)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleClear} className="bg-transparent">
                <Eraser className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>清空</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFillDown}
                className="bg-transparent"
                disabled={editingMonthIdx === null}
              >
                <ArrowDownToLine className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>向下填滿至所有後續月份</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-14 gap-2">
        {RR_DAYS.map((day) => (
          <div key={day} className="flex flex-col">
            <label className="text-xs text-muted-foreground mb-1">RR{day}</label>
            <Input
              type="text"
              inputMode="decimal"
              value={getDisplayValue(day)}
              onChange={(e) => handleInputChange(day, e.target.value)}
              onBlur={() => handleInputBlur(day)}
              onKeyDown={(e) => handleKeyDown(e, day)}
              className="h-8 text-sm text-center"
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}
