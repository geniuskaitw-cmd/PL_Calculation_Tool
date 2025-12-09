"use client"

import { RetentionModelSection } from "./retention-model-section"
import { TimeAxisSection } from "./time-axis-section"
import { MonthlyPlanTable } from "./monthly-plan-table"

export function BusinessPlanTab() {
  return (
    <div className="space-y-6">
      <TimeAxisSection />
      <RetentionModelSection />
      <MonthlyPlanTable />
    </div>
  )
}
