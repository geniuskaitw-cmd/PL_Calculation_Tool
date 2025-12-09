"use client"

import { ChevronDown } from "lucide-react"

interface FillDownButtonProps {
  onClick: () => void
}

export function FillDownButton({ onClick }: FillDownButtonProps) {
  return (
    <button
      onClick={onClick}
      className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-0.5 rounded hover:bg-muted ml-0.5"
      title="向下填滿"
    >
      <ChevronDown className="h-3 w-3" />
    </button>
  )
}
