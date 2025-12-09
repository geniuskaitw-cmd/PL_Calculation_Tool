"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useFinance } from "@/lib/finance-context"
import { CollapsibleCard } from "./collapsible-card"

export function TimeAxisSection() {
  const { timelineConfig, setTimelineConfig, handleTimelineResize } = useFinance()
  const [collapsed, setCollapsed] = useState(true)

  return (
    <CollapsibleCard title="時間軸設定" collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Start Month (M-)</label>
          <Input
            type="number"
            value={timelineConfig.devStart}
            onChange={(e) => setTimelineConfig({ ...timelineConfig, devStart: Number.parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">End Month (M+)</label>
          <Input
            type="number"
            value={timelineConfig.opsEnd}
            onChange={(e) => setTimelineConfig({ ...timelineConfig, opsEnd: Number.parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="flex items-end">
          <Button onClick={handleTimelineResize} variant="secondary" className="w-full">
            Apply Timeline
          </Button>
        </div>
      </div>
    </CollapsibleCard>
  )
}
