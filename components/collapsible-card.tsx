"use client"

import type { ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface CollapsibleCardProps {
  title: string
  subtitle?: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}

export function CollapsibleCard({ title, collapsed, onToggle, children }: CollapsibleCardProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
      </button>

      {!collapsed && <div className="px-6 pb-6">{children}</div>}
    </div>
  )
}
