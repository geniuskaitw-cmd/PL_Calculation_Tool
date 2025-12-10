"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, ChevronDown, ChevronRight, Users, DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useFinance } from "@/lib/finance-context"
import type { SpecialCostType, RemovableItemType } from "@/lib/finance-types"
import { SPECIAL_COST_OPTIONS, REMOVABLE_ITEM_OPTIONS } from "@/lib/finance-types"

export function IncomeTable() {
  const {
    plData,
    timeline,
    updateMonth,
    settings,
    customCostItems,
    setCustomCostItems,
    removedItems,
    setRemovedItems,
    timelineConfig,
  } = useFinance()
  const [showAddCostInput, setShowAddCostInput] = useState(false)
  const [newCostName, setNewCostName] = useState("")
  const [selectedDropdownItem, setSelectedDropdownItem] = useState<string>("")
  const [laborDisplayMode, setLaborDisplayMode] = useState<"people" | "money">("people")
  const [tempHeadcounts, setTempHeadcounts] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState({
    grossSales: true,
    netSales: true,
    royalties: true,
    channelFees: true,
    costs: true,
  })

  const allDropdownOptions = [
    ...SPECIAL_COST_OPTIONS.map((o) => ({ ...o, type: "special" as const })),
    ...REMOVABLE_ITEM_OPTIONS.filter((o) => removedItems.includes(o.id)).map((o) => ({
      ...o,
      type: "removable" as const,
    })),
  ]

  const handleAddCustomCost = () => {
    if (selectedDropdownItem) {
      const specialOpt = SPECIAL_COST_OPTIONS.find((o) => o.id === selectedDropdownItem)
      if (specialOpt && !isSpecialCostEnabled(specialOpt.id)) {
        setCustomCostItems([
          ...customCostItems,
          {
            id: `special_${specialOpt.id}_${Date.now()}`,
            name: specialOpt.name,
            visible: true,
            category: "special",
            specialType: specialOpt.id,
          },
        ])
      }

      const removableOpt = REMOVABLE_ITEM_OPTIONS.find((o) => o.id === selectedDropdownItem)
      if (removableOpt && removedItems.includes(removableOpt.id)) {
        setRemovedItems((prev) => prev.filter((id) => id !== removableOpt.id))
      }

      setSelectedDropdownItem("")
      setShowAddCostInput(false)
      return
    }

    if (!newCostName.trim()) return
    setCustomCostItems([
      ...customCostItems,
      { id: `cost_${Date.now()}`, name: newCostName, visible: true, category: "user-defined" },
    ])
    setNewCostName("")
    setShowAddCostInput(false)
  }

  const handleRemoveDefaultItem = (itemId: RemovableItemType) => {
    setRemovedItems((prev) => [...prev, itemId])
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const allMonths = plData
  const displayMonths = allMonths

  const getSum = (field: keyof (typeof plData)[0], data = allMonths) => {
    return data.reduce((acc, curr) => acc + (Number(curr[field]) || 0), 0)
  }

  const opsData = plData.filter((m) => !m.isDev)

  const getY1Sum = (field: keyof (typeof plData)[0]) => getSum(field, opsData.slice(0, 12))
  const getAllSum = (field: keyof (typeof plData)[0]) => getSum(field, opsData)

  const showAllColumn = timelineConfig.opsEnd > 12

  const formatNumber = (num: number) => Math.round(num).toLocaleString()

  const cellClass = "px-3 py-1.5 border border-border rounded-md bg-card text-right text-sm whitespace-nowrap"
  const headerRowClass = "bg-[oklch(0.50_0.025_220)] text-white"
  const subHeaderClass = "bg-[oklch(0.55_0.025_220)] text-white"

  const isSpecialCostEnabled = (type: SpecialCostType) => {
    return customCostItems.some((item) => item.specialType === type)
  }

  const isItemRemoved = (itemId: RemovableItemType) => removedItems.includes(itemId)

  const SectionToggle = ({
    section,
    label,
  }: {
    section: keyof typeof expandedSections
    label: string
  }) => (
    <button onClick={() => toggleSection(section)} className="flex items-center gap-1 font-semibold text-left">
      {expandedSections[section] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      {label}
    </button>
  )

  const RemovableRow = ({
    itemId,
    label,
    field,
    isDestructive = false,
  }: {
    itemId: RemovableItemType
    label: string
    field: keyof (typeof plData)[0]
    isDestructive?: boolean
  }) => {
    if (isItemRemoved(itemId)) return null
    return (
      <tr className="border-b group">
        <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
          <div className="flex justify-center items-center gap-2">
            <span>{label}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100"
              onClick={() => handleRemoveDefaultItem(itemId)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
        {displayMonths.map((d) => (
          <td key={d.id} className="p-1">
            <div className={cellClass + (isDestructive ? " text-destructive" : "")}>
              {formatNumber(Number(d[field]) || 0)}
            </div>
          </td>
        ))}
        <td className="p-1 bg-muted/30">
          <div className={cellClass}>{formatNumber(getY1Sum(field))}</div>
        </td>
        {showAllColumn && (
          <td className="p-1 bg-muted/30">
            <div className={cellClass}>{formatNumber(getAllSum(field))}</div>
          </td>
        )}
      </tr>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold">損益表 (P&L)</h2>
        {showAddCostInput ? (
          <div className="flex items-center gap-2">
            <Select value={selectedDropdownItem} onValueChange={setSelectedDropdownItem}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="選擇項目..." />
              </SelectTrigger>
              <SelectContent>
                {allDropdownOptions.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    disabled={option.type === "special" && isSpecialCostEnabled(option.id as SpecialCostType)}
                  >
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground">或</span>

            <Input
              value={newCostName}
              onChange={(e) => setNewCostName(e.target.value)}
              placeholder="輸入名稱..."
              className="w-32 h-8"
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomCost()}
            />

            <Button size="sm" onClick={handleAddCustomCost} disabled={!selectedDropdownItem && !newCostName.trim()}>
              OK
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddCostInput(false)
                setSelectedDropdownItem("")
                setNewCostName("")
              }}
            >
              取消
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowAddCostInput(true)} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            新增成本
          </Button>
        )}
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-center font-medium py-2 w-48 min-w-[180px] sticky left-0 bg-card z-10">科目</th>
              {displayMonths.map((m) => (
                <th key={m.id} className="font-medium py-2 px-2 min-w-[90px] text-center">
                  {m.monthLabel}
                </th>
              ))}
              <th className="font-medium py-2 px-2 min-w-[100px] text-center bg-muted/50">Y-1</th>
              {showAllColumn && <th className="font-medium py-2 px-2 min-w-[100px] text-center bg-muted/50">ALL</th>}
            </tr>
          </thead>
          <tbody>
            {/* Gross Sales Section */}
            <tr className={headerRowClass}>
              <td className="py-2 px-3 sticky left-0 z-10 bg-[oklch(0.50_0.025_220)] text-center">
                <SectionToggle section="grossSales" label="總流水" />
              </td>
              {displayMonths.map((d) => (
                <td key={d.id} className="py-2 px-2 text-right">
                  {formatNumber(d.grossRevenue)}
                </td>
              ))}
              <td className="py-2 px-2 text-right bg-[oklch(0.47_0.025_220)]">
                {formatNumber(getY1Sum("grossRevenue"))}
              </td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right bg-[oklch(0.47_0.025_220)]">
                  {formatNumber(getAllSum("grossRevenue"))}
                </td>
              )}
            </tr>

            {expandedSections.grossSales && (
              <>
                <RemovableRow itemId="grossSalesIos" label="總流水-iOS" field="grossSalesIos" />
                <RemovableRow itemId="grossSalesAndroid" label="總流水-安卓" field="grossSalesAndroid" />
                {isSpecialCostEnabled("grossSalesOfficial") && (
                  <tr className="border-b group">
                    <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span>總流水-官網</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={() =>
                            setCustomCostItems((p) => p.filter((x) => x.specialType !== "grossSalesOfficial"))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    {displayMonths.map((d) => (
                      <td key={d.id} className="p-1">
                        <div className={cellClass}>{formatNumber(d.grossSalesOfficial)}</div>
                      </td>
                    ))}
                    <td className="p-1 bg-muted/30">
                      <div className={cellClass}>{formatNumber(getY1Sum("grossSalesOfficial"))}</div>
                    </td>
                    {showAllColumn && (
                      <td className="p-1 bg-muted/30">
                        <div className={cellClass}>{formatNumber(getAllSum("grossSalesOfficial"))}</div>
                      </td>
                    )}
                  </tr>
                )}

                <RemovableRow itemId="refund" label="退款" field="refund" isDestructive />
                <RemovableRow itemId="tax" label="消費稅" field="tax" isDestructive />
              </>
            )}

            {/* Net Sales Section */}
            <tr className={headerRowClass}>
              <td className="py-2 px-3 sticky left-0 z-10 bg-[oklch(0.50_0.025_220)] text-center">
                <SectionToggle section="netSales" label="去稅流水" />
              </td>
              {displayMonths.map((d) => (
                <td key={d.id} className="py-2 px-2 text-right">
                  {formatNumber(d.netSales)}
                </td>
              ))}
              <td className="py-2 px-2 text-right bg-[oklch(0.47_0.025_220)]">{formatNumber(getY1Sum("netSales"))}</td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right bg-[oklch(0.47_0.025_220)]">
                  {formatNumber(getAllSum("netSales"))}
                </td>
              )}
            </tr>

            {expandedSections.netSales && (
              <>
                <RemovableRow itemId="netSalesIos" label="去稅流水-iOS" field="netSalesIos" />
                <RemovableRow itemId="netSalesAndroid" label="去稅流水-安卓" field="netSalesAndroid" />
                {isSpecialCostEnabled("netSalesOfficial") && (
                  <tr className="border-b group">
                    <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span>去稅流水-官網</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={() =>
                            setCustomCostItems((p) => p.filter((x) => x.specialType !== "netSalesOfficial"))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    {displayMonths.map((d) => (
                      <td key={d.id} className="p-1">
                        <div className={cellClass}>{formatNumber(d.netSalesOfficial)}</div>
                      </td>
                    ))}
                    <td className="p-1 bg-muted/30">
                      <div className={cellClass}>{formatNumber(getY1Sum("netSalesOfficial"))}</div>
                    </td>
                    {showAllColumn && (
                      <td className="p-1 bg-muted/30">
                        <div className={cellClass}>{formatNumber(getAllSum("netSalesOfficial"))}</div>
                      </td>
                    )}
                  </tr>
                )}
              </>
            )}

            {/* Royalties Section */}
            <tr className={subHeaderClass}>
              <td className="py-2 px-3 sticky left-0 z-10 bg-[oklch(0.55_0.025_220)] text-center">
                <SectionToggle section="royalties" label="版稅" />
              </td>
              {displayMonths.map((d) => (
                <td key={d.id} className="py-2 px-2 text-right">
                  {formatNumber(d.ipCost + d.cpCost + d.opeCost)}
                </td>
              ))}
              <td className="py-2 px-2 text-right bg-[oklch(0.52_0.025_220)]">
                {formatNumber(getY1Sum("ipCost") + getY1Sum("cpCost") + getY1Sum("opeCost"))}
              </td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right bg-[oklch(0.52_0.025_220)]">
                  {formatNumber(getAllSum("ipCost") + getAllSum("cpCost") + getAllSum("opeCost"))}
                </td>
              )}
            </tr>

            {expandedSections.royalties && (
              <>
                <RemovableRow itemId="ipCost" label="IP R/S" field="ipCost" isDestructive />
                <RemovableRow itemId="cpCost" label="CP R/S" field="cpCost" isDestructive />
                {isSpecialCostEnabled("opeRoyalty") && (
                  <tr className="border-b group">
                    <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span>聯運分成</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={() => setCustomCostItems((p) => p.filter((x) => x.specialType !== "opeRoyalty"))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    {displayMonths.map((d) => (
                      <td key={d.id} className="p-1">
                        <div className={cellClass + " text-destructive"}>{formatNumber(d.opeCost)}</div>
                      </td>
                    ))}
                    <td className="p-1 bg-muted/30">
                      <div className={cellClass}>{formatNumber(getY1Sum("opeCost"))}</div>
                    </td>
                    {showAllColumn && (
                      <td className="p-1 bg-muted/30">
                        <div className={cellClass}>{formatNumber(getAllSum("opeCost"))}</div>
                      </td>
                    )}
                  </tr>
                )}
              </>
            )}

            {/* Channel Fees Section */}
            <tr className={subHeaderClass}>
              <td className="py-2 px-3 sticky left-0 z-10 bg-[oklch(0.55_0.025_220)] text-center">
                <SectionToggle section="channelFees" label="渠道費" />
              </td>
              {displayMonths.map((d) => (
                <td key={d.id} className="py-2 px-2 text-right">
                  {formatNumber(d.channelFee)}
                </td>
              ))}
              <td className="py-2 px-2 text-right bg-[oklch(0.52_0.025_220)]">
                {formatNumber(getY1Sum("channelFee"))}
              </td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right bg-[oklch(0.52_0.025_220)]">
                  {formatNumber(getAllSum("channelFee"))}
                </td>
              )}
            </tr>

            {expandedSections.channelFees && (
              <>
                <RemovableRow itemId="channelFeeIos" label="iOS渠道費" field="channelFeeIos" isDestructive />
                <RemovableRow itemId="channelFeeAndroid" label="安卓渠道費" field="channelFeeAndroid" isDestructive />
                {isSpecialCostEnabled("channelFeeOfficial") && (
                  <tr className="border-b group">
                    <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span>官網渠道費</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={() =>
                            setCustomCostItems((p) => p.filter((x) => x.specialType !== "channelFeeOfficial"))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    {displayMonths.map((d) => (
                      <td key={d.id} className="p-1">
                        <div className={cellClass + " text-destructive"}>{formatNumber(d.channelFeeOfficial)}</div>
                      </td>
                    ))}
                    <td className="p-1 bg-muted/30">
                      <div className={cellClass}>{formatNumber(getY1Sum("channelFeeOfficial"))}</div>
                    </td>
                    {showAllColumn && (
                      <td className="p-1 bg-muted/30">
                        <div className={cellClass}>{formatNumber(getAllSum("channelFeeOfficial"))}</div>
                      </td>
                    )}
                  </tr>
                )}
              </>
            )}

            {/* CM1 - 靠左對齊 */}
            <tr className={headerRowClass}>
              <td className="py-2 px-3 font-semibold sticky left-0 z-10 bg-[oklch(0.50_0.025_220)] text-left pl-4">
                CM1
              </td>
              {displayMonths.map((d) => (
                <td key={d.id} className="py-2 px-2 text-right font-semibold">
                  {formatNumber(d.cm1)}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-semibold bg-[oklch(0.47_0.025_220)]">
                {formatNumber(getY1Sum("cm1"))}
              </td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right font-semibold bg-[oklch(0.47_0.025_220)]">
                  {formatNumber(getAllSum("cm1"))}
                </td>
              )}
            </tr>

            {/* Marketing */}
            <RemovableRow itemId="marketingCost" label="市場費" field="marketingCost" isDestructive />

            {/* CM2 - 靠左對齊 */}
            <tr className={headerRowClass}>
              <td className="py-2 px-3 font-semibold sticky left-0 z-10 bg-[oklch(0.50_0.025_220)] text-left pl-4">
                CM2
              </td>
              {displayMonths.map((d) => (
                <td key={d.id} className="py-2 px-2 text-right font-semibold">
                  {formatNumber(d.cm2)}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-semibold bg-[oklch(0.47_0.025_220)]">
                {formatNumber(getY1Sum("cm2"))}
              </td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right font-semibold bg-[oklch(0.47_0.025_220)]">
                  {formatNumber(getAllSum("cm2"))}
                </td>
              )}
            </tr>

            {/* Fixed Costs Section */}
            <tr className={subHeaderClass}>
              <td className="py-2 px-3 sticky left-0 z-10 bg-[oklch(0.55_0.025_220)] text-center">
                <SectionToggle section="costs" label="固定成本" />
              </td>
              {displayMonths.map((d) => (
                <td key={d.id} className="py-2 px-2 text-right">
                  {formatNumber(d.fc)}
                </td>
              ))}
              <td className="py-2 px-2 text-right bg-[oklch(0.52_0.025_220)]">{formatNumber(getY1Sum("fc"))}</td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right bg-[oklch(0.52_0.025_220)]">{formatNumber(getAllSum("fc"))}</td>
              )}
            </tr>

            {expandedSections.costs && (
              <>
                {/* Labor Cost with toggle */}
                {!isItemRemoved("laborCost") && (
                  <tr className="border-b group">
                    <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span>人力成本</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => setLaborDisplayMode(laborDisplayMode === "people" ? "money" : "people")}
                              >
                                {laborDisplayMode === "people" ? (
                                  <Users className="h-3 w-3" />
                                ) : (
                                  <DollarSign className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{laborDisplayMode === "people" ? "顯示人數" : "顯示金額"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemoveDefaultItem("laborCost")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    {displayMonths.map((d) => (
                      <td key={d.id} className="p-1">
                        {laborDisplayMode === "people" ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={tempHeadcounts[d.id] ?? d.headcount}
                            onChange={(e) => setTempHeadcounts({ ...tempHeadcounts, [d.id]: e.target.value })}
                            onBlur={(e) => {
                              const val = Number.parseFloat(e.target.value) || 0
                              updateMonth(d.id, "headcount", val)
                              const newTemps = { ...tempHeadcounts }
                              delete newTemps[d.id]
                              setTempHeadcounts(newTemps)
                            }}
                            className="w-full h-7 text-right text-sm"
                          />
                        ) : (
                          <div className={cellClass + " text-destructive"}>{formatNumber(d.laborCost)}</div>
                        )}
                      </td>
                    ))}
                    <td className="p-1 bg-muted/30">
                      <div className={cellClass}>{formatNumber(getY1Sum("laborCost"))}</div>
                    </td>
                    {showAllColumn && (
                      <td className="p-1 bg-muted/30">
                        <div className={cellClass}>{formatNumber(getAllSum("laborCost"))}</div>
                      </td>
                    )}
                  </tr>
                )}

                {settings.useServerRatio ? (
                  <RemovableRow itemId="serverCost" label="伺服器費" field="serverCost" isDestructive />
                ) : (
                  !isItemRemoved("serverCost") && (
                    <tr className="border-b group">
                      <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
                        <div className="flex justify-center items-center gap-2">
                          <span>伺服器費</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveDefaultItem("serverCost")}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      {displayMonths.map((d) => (
                        <td key={d.id} className="p-1">
                          <Input
                            type="number"
                            value={d.serverOverride}
                            onChange={(e) => updateMonth(d.id, "serverOverride", Number.parseFloat(e.target.value) || 0)}
                            className="w-full h-7 text-right text-sm"
                          />
                        </td>
                      ))}
                      <td className="p-1 bg-muted/30">
                        <div className={cellClass + " text-destructive"}>{formatNumber(getY1Sum("serverCost"))}</div>
                      </td>
                      {showAllColumn && (
                        <td className="p-1 bg-muted/30">
                          <div className={cellClass + " text-destructive"}>{formatNumber(getAllSum("serverCost"))}</div>
                        </td>
                      )}
                    </tr>
                  )
                )}

                {/* Custom Cost Items (user-defined go here, after FC) */}
                {customCostItems
                  .filter((item) => item.visible && item.category === "user-defined")
                  .map((item) => (
                    <tr key={item.id} className="border-b group">
                      <td className="py-1.5 pl-8 sticky left-0 bg-card z-10 text-muted-foreground text-center">
                        <div className="flex justify-center items-center gap-2">
                          <span>{item.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={() => setCustomCostItems((p) => p.filter((x) => x.id !== item.id))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      {displayMonths.map((d) => (
                        <td key={d.id} className="p-1">
                          <Input
                            type="number"
                            value={d.customCosts[item.id] || 0}
                            onChange={(e) =>
                              updateMonth(d.id, `custom_${item.id}`, Number.parseInt(e.target.value) || 0)
                            }
                            className="w-full h-7 text-right text-sm"
                          />
                        </td>
                      ))}
                      <td className="p-1 bg-muted/30">
                        <div className={cellClass}>
                          {formatNumber(opsData.slice(0, 12).reduce((a, b) => a + (b.customCosts[item.id] || 0), 0))}
                        </div>
                      </td>
                      {showAllColumn && (
                        <td className="p-1 bg-muted/30">
                          <div className={cellClass}>
                            {formatNumber(opsData.reduce((a, b) => a + (b.customCosts[item.id] || 0), 0))}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </>
            )}

            {/* Profit - 靠左對齊 */}
            <tr className="bg-[oklch(0.45_0.03_220)] text-white">
              <td className="py-2 px-3 font-bold sticky left-0 z-10 bg-[oklch(0.45_0.03_220)] text-left pl-4">利潤</td>
              {displayMonths.map((d) => (
                <td key={d.id} className={`py-2 px-2 text-right font-bold ${d.profit >= 0 ? "" : "text-red-300"}`}>
                  {formatNumber(d.profit)}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-bold bg-[oklch(0.42_0.03_220)]">
                {formatNumber(getY1Sum("profit"))}
              </td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right font-bold bg-[oklch(0.42_0.03_220)]">
                  {formatNumber(getAllSum("profit"))}
                </td>
              )}
            </tr>

            {/* Accumulated Profit - 靠左對齊 */}
            <tr className="bg-[oklch(0.40_0.035_220)] text-white">
              <td className="py-2 px-3 font-bold sticky left-0 z-10 bg-[oklch(0.40_0.035_220)] text-left pl-4">
                累計利潤
              </td>
              {displayMonths.map((d) => (
                <td
                  key={d.id}
                  className={`py-2 px-2 text-right font-bold ${d.accProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {formatNumber(d.accProfit)}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-bold bg-[oklch(0.37_0.035_220)]">
                {formatNumber(opsData[Math.min(11, opsData.length - 1)]?.accProfit || 0)}
              </td>
              {showAllColumn && (
                <td className="py-2 px-2 text-right font-bold bg-[oklch(0.37_0.035_220)]">
                  {formatNumber(opsData[opsData.length - 1]?.accProfit || 0)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
