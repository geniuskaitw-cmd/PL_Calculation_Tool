"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useFinance } from "@/lib/finance-context"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { settings, setSettings } = useFinance()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">全域參數設定</DialogTitle>
        </DialogHeader>

        {/* Platform Mix */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <h3 className="text-sm font-bold text-primary mb-3">1. 渠道分成與佔比 (Platform Mix)</h3>
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-2 text-center font-medium">
            <div>平台</div>
            <div>營收佔比%</div>
            <div>渠道費%</div>
            <div>實收比例</div>
          </div>
          {(["ios", "android", "official"] as const).map((k) => {
            const p = settings.platforms[k]
            const labels = { ios: "iOS", android: "Android", official: "官網" }
            return (
              <div key={k} className="grid grid-cols-4 gap-2 items-center mb-2">
                <div className="font-bold bg-background border py-1 text-center rounded text-xs">{labels[k]}</div>
                <Input
                  type="number"
                  value={p.share}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platforms: {
                        ...settings.platforms,
                        [k]: { ...p, share: Number.parseFloat(e.target.value) || 0 },
                      },
                    })
                  }
                  className="text-center h-8"
                />
                <Input
                  type="number"
                  value={p.fee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platforms: { ...settings.platforms, [k]: { ...p, fee: Number.parseFloat(e.target.value) || 0 } },
                    })
                  }
                  className="text-center h-8 text-destructive"
                />
                <div className="text-center text-xs text-muted-foreground">{100 - p.fee}%</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Deductions */}
          <div>
            <h3 className="text-sm font-bold text-orange-500 mb-2">2. 損耗與分成</h3>
            <div className="space-y-3">
              {[
                { label: "稅率 (Tax Rate)", key: "taxRate" as const },
                { label: "退款率 (Refund)", key: "refundRate" as const },
                { label: "IP 分成 (IP R/S)", key: "ipRoyalty" as const },
                { label: "CP 分成 (CP R/S)", key: "cpRoyalty" as const },
                { label: "聯運分成 (OPE R/S)", key: "opeRoyalty" as const },
              ].map((item) => (
                <div key={item.key} className="flex justify-between items-center text-xs">
                  <span>{item.label}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={settings[item.key]}
                      onChange={(e) => setSettings({ ...settings, [item.key]: Number.parseFloat(e.target.value) || 0 })}
                      className="w-16 h-7 text-right"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Costs */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 mb-2">3. 成本參數</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span>人力單價 (Labor Cost)</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={settings.laborUnitCost}
                    onChange={(e) =>
                      setSettings({ ...settings, laborUnitCost: Number.parseFloat(e.target.value) || 0 })
                    }
                    className="w-20 h-7 text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>伺服器費 (Infra Cost)</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={settings.useServerRatio ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, useServerRatio: true })}
                    className="h-6 px-2 text-xs"
                  >
                    %
                  </Button>
                  <Button
                    size="sm"
                    variant={!settings.useServerRatio ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, useServerRatio: false })}
                    className="h-6 px-2 text-xs"
                  >
                    $
                  </Button>
                </div>
              </div>
              {settings.useServerRatio && (
                <div className="flex justify-end items-center text-xs">
                  <span className="mr-2 text-muted-foreground">營收佔比</span>
                  <Input
                    type="number"
                    value={settings.serverCostRatio}
                    onChange={(e) =>
                      setSettings({ ...settings, serverCostRatio: Number.parseFloat(e.target.value) || 0 })
                    }
                    className="w-16 h-7 text-right"
                  />
                  <span className="ml-1 text-muted-foreground">%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full mt-4">
          完成設定
        </Button>
      </DialogContent>
    </Dialog>
  )
}
