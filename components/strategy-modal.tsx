"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import { getUniformWeights } from "@/lib/finance-utils"

interface StrategyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialWeights: number[]
  onSave: (weights: number[]) => void
}

export function StrategyModal({ open, onOpenChange, initialWeights, onSave }: StrategyModalProps) {
  const [tempWeights, setTempWeights] = useState<number[]>(initialWeights)

  useEffect(() => {
    if (open) {
      setTempWeights([...initialWeights])
    }
  }, [open, initialWeights])

  const sum = tempWeights.reduce((a, b) => a + b, 0)
  const isValid = Math.abs(sum - 100) < 0.1

  const handleSave = () => {
    if (!isValid) {
      alert(`總和必須為 100% (目前: ${sum.toFixed(1)}%)`)
      return
    }
    onSave(tempWeights)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">自訂導入策略 (Custom Traffic Distribution)</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">請設定 30 天內的每日導入比例 (NUU %)。總和必須為 100%。</p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTempWeights(getUniformWeights())}>
            重置為平均 (Uniform)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const w = new Array(30).fill(0)
              w[0] = 50
              w[1] = 30
              w[2] = 20
              setTempWeights(w)
            }}
          >
            極速爆發 (前3天)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const w = new Array(30).fill(0)
              const smoothProfile = [15, 10, 10, 5, 5, 3, 2] // Sum = 50
              const remainingPct = 50
              const remainingDays = 30 - smoothProfile.length // 23
              const tailAvg = remainingPct / remainingDays // ~2.17

              for (let i = 0; i < 30; i++) {
                if (i < smoothProfile.length) {
                  w[i] = smoothProfile[i]
                } else {
                  w[i] = tailAvg
                }
              }
              setTempWeights(w)
            }}
          >
            平緩導入 (Smooth)
          </Button>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {tempWeights.map((w, i) => (
            <div key={i} className="flex flex-col">
              <label className="text-[10px] text-muted-foreground mb-1">Day {i + 1}</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={Number(w).toFixed(2)}
                  onChange={(e) => {
                    const newW = [...tempWeights]
                    newW[i] = Number.parseFloat(e.target.value) || 0
                    setTempWeights(newW)
                  }}
                  className={`text-right pr-6 h-8 text-xs ${w > 0 ? "border-primary bg-primary/5" : ""}`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center border-t pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">目前總和:</span>
            <span className={`text-xl font-bold ${isValid ? "text-green-600" : "text-destructive"}`}>
              {sum.toFixed(1)}%
            </span>
            {!isValid && (
              <span className="text-xs text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded">
                <XCircle size={12} /> 需調整至 100%
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              儲存策略
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
