"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { useFinance } from "@/lib/finance-context"
import { StrategyModal } from "./strategy-modal"
import { FillDownButton } from "./fill-down-button"

export function MonthlyPlanTable() {
  const { calculatedMetrics, updateMonth, timeline } = useFinance()
  const [strategyModal, setStrategyModal] = useState<{ open: boolean; monthId: string | null; weights: number[] }>({
    open: false,
    monthId: null,
    weights: [],
  })
  const [tempInputs, setTempInputs] = useState<Record<string, string>>({})

  const openStrategyModal = (row: (typeof calculatedMetrics)[0]) => {
    setStrategyModal({
      open: true,
      monthId: row.id,
      weights: [...row.customDailyWeights],
    })
  }

  const handleSaveStrategy = (weights: number[]) => {
    if (strategyModal.monthId) {
      updateMonth(strategyModal.monthId, "customDailyWeights", weights)
    }
  }

  const opsData = calculatedMetrics.filter((m) => !m.isDev)

  const fillDown = (rowIndex: number, field: string, value: string | number) => {
    const currentIds = opsData.slice(rowIndex).map((r) => r.id)
    currentIds.forEach((id) => {
      updateMonth(id, field, value)
    })
  }

  const fillDownCustomWeights = (rowIndex: number, weights: number[]) => {
    const currentIds = opsData.slice(rowIndex).map((r) => r.id)
    currentIds.forEach((id) => {
      updateMonth(id, "customDailyWeights", weights)
      updateMonth(id, "strategy", "custom")
    })
  }

  const formatNumber = (num: number) => Math.round(num).toLocaleString()

  const getTempKey = (rowId: string, field: string) => `${rowId}_${field}`

  const handleDecimalInputChange = (rowId: string, field: string, value: string) => {
    setTempInputs((prev) => ({ ...prev, [getTempKey(rowId, field)]: value }))
  }

  const handleDecimalInputBlur = (rowId: string, field: string) => {
    const key = getTempKey(rowId, field)
    const val = tempInputs[key]
    if (val !== undefined) {
      const parsed = Number.parseFloat(val) || 0
      updateMonth(rowId, field, parsed)
      setTempInputs((prev) => {
        const newInputs = { ...prev }
        delete newInputs[key]
        return newInputs
      })
    }
  }

  const getDecimalValue = (rowId: string, field: string, actualValue: number) => {
    const key = getTempKey(rowId, field)
    return tempInputs[key] !== undefined ? tempInputs[key] : actualValue.toString()
  }

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">月度經營計劃</h2>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold text-center">Month</TableHead>
              <TableHead className="font-semibold text-center">導入策略</TableHead>
              <TableHead className="font-semibold text-center">預算模式</TableHead>
              <TableHead className="font-semibold text-center">NUU</TableHead>
              <TableHead className="font-semibold text-center">預算</TableHead>
              <TableHead className="font-semibold text-center">eCPA</TableHead>
              <TableHead className="font-semibold text-center">DAU</TableHead>
              <TableHead className="font-semibold text-center">ARPDAU</TableHead>
              <TableHead className="font-semibold text-center">REV</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opsData.map((row, rowIndex) => (
              <TableRow key={row.id} className="hover:bg-muted/30 group">
                <TableCell className="font-medium text-center">{row.monthLabel}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 group">
                    <Select value={row.strategy} onValueChange={(v) => updateMonth(row.id, "strategy", v)}>
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avg">平均</SelectItem>
                        <SelectItem value="custom">自訂</SelectItem>
                      </SelectContent>
                    </Select>
                    {row.strategy === "custom" && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openStrategyModal(row)}>
                        <Settings className="h-3 w-3" />
                      </Button>
                    )}
                    <FillDownButton
                      onClick={() => {
                        if (row.strategy === "custom") {
                          fillDownCustomWeights(rowIndex, row.customDailyWeights)
                        } else {
                          fillDown(rowIndex, "strategy", row.strategy)
                        }
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        const modes = ["Fix_Budget_NUU", "Fix_CPA_NUU", "Fix_Budget_CPA"] as const
                        const currentIdx = modes.indexOf(row.calcMode)
                        const next = modes[(currentIdx + 1) % 3]
                        updateMonth(row.id, "calcMode", next)
                      }}
                    >
                      {row.calcMode.split("_")[1]}+{row.calcMode.split("_")[2]}
                    </Button>
                    <FillDownButton onClick={() => fillDown(rowIndex, "calcMode", row.calcMode)} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center group">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={row.nuu.toLocaleString()}
                      readOnly={row.calcMode === "Fix_Budget_CPA"}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value.replace(/,/g, "")) || 0
                        updateMonth(row.id, "nuu", val)
                      }}
                      className={`w-24 h-8 text-center ${row.calcMode === "Fix_Budget_CPA" ? "bg-muted text-muted-foreground" : ""}`}
                    />
                    <FillDownButton onClick={() => fillDown(rowIndex, "nuu", row.nuu)} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center group">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={row.marketing.toLocaleString()}
                      readOnly={row.calcMode === "Fix_CPA_NUU"}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value.replace(/,/g, "")) || 0
                        updateMonth(row.id, "marketing", val)
                      }}
                      className={`w-28 h-8 text-center ${row.calcMode === "Fix_CPA_NUU" ? "bg-muted text-muted-foreground" : ""}`}
                    />
                    <FillDownButton onClick={() => fillDown(rowIndex, "marketing", row.marketing)} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center group">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={getDecimalValue(row.id, "ecpa", row.ecpa)}
                      readOnly={row.calcMode === "Fix_Budget_NUU"}
                      onChange={(e) => handleDecimalInputChange(row.id, "ecpa", e.target.value)}
                      onBlur={() => handleDecimalInputBlur(row.id, "ecpa")}
                      className={`w-24 h-8 text-center ${row.calcMode === "Fix_Budget_NUU" ? "bg-muted text-muted-foreground" : ""}`}
                    />
                    <FillDownButton onClick={() => fillDown(rowIndex, "ecpa", row.ecpa)} />
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold">{formatNumber(row.dau)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center group">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={getDecimalValue(row.id, "arpdau", row.arpdau)}
                      onChange={(e) => handleDecimalInputChange(row.id, "arpdau", e.target.value)}
                      onBlur={() => handleDecimalInputBlur(row.id, "arpdau")}
                      className="w-24 h-8 text-center"
                    />
                    <FillDownButton onClick={() => fillDown(rowIndex, "arpdau", row.arpdau)} />
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold">${formatNumber(row.grossRevenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <StrategyModal
        open={strategyModal.open}
        onOpenChange={(open) => setStrategyModal((prev) => ({ ...prev, open }))}
        initialWeights={strategyModal.weights}
        onSave={handleSaveStrategy}
      />
    </div>
  )
}
