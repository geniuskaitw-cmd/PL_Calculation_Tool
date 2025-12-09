// 財務計算相關的類型定義

export const RR_DAYS = [
  1, 3, 7, 14, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630,
  660, 690, 720,
]

export type SpecialCostType = "grossSalesOfficial" | "netSalesOfficial" | "opeRoyalty" | "channelFeeOfficial"

export const SPECIAL_COST_OPTIONS: { id: SpecialCostType; name: string; section: string }[] = [
  { id: "grossSalesOfficial", name: "總流水-官網", section: "grossSales" },
  { id: "netSalesOfficial", name: "去稅流水-官網", section: "netSales" },
  { id: "opeRoyalty", name: "聯運分成", section: "royalties" },
  { id: "channelFeeOfficial", name: "官網渠道費", section: "channelFees" },
]

export type RemovableItemType =
  | "grossSalesIos"
  | "grossSalesAndroid"
  | "refund"
  | "tax"
  | "netSalesIos"
  | "netSalesAndroid"
  | "ipCost"
  | "cpCost"
  | "channelFeeIos"
  | "channelFeeAndroid"
  | "laborCost"
  | "serverCost"
  | "marketingCost"

export const REMOVABLE_ITEM_OPTIONS: { id: RemovableItemType; name: string; section: string }[] = [
  { id: "grossSalesIos", name: "總流水-iOS", section: "grossSales" },
  { id: "grossSalesAndroid", name: "總流水-安卓", section: "grossSales" },
  { id: "refund", name: "退款", section: "grossSales" },
  { id: "tax", name: "消費稅", section: "grossSales" },
  { id: "netSalesIos", name: "去稅流水-iOS", section: "netSales" },
  { id: "netSalesAndroid", name: "去稅流水-安卓", section: "netSales" },
  { id: "ipCost", name: "IP分成", section: "royalties" },
  { id: "cpCost", name: "CP分成", section: "royalties" },
  { id: "channelFeeIos", name: "iOS渠道費", section: "channelFees" },
  { id: "channelFeeAndroid", name: "安卓渠道費", section: "channelFees" },
  { id: "laborCost", name: "人力成本", section: "costs" },
  { id: "serverCost", name: "伺服器/平台費", section: "costs" },
  { id: "marketingCost", name: "行銷費用", section: "marketing" },
]

export interface MonthlyData {
  id: string
  monthLabel: string
  monthIndex: number
  isDev: boolean
  nuu: number
  marketing: number
  ecpa: number
  arpdau: number
  strategy: "avg" | "custom"
  customDailyWeights: number[]
  calcMode: "Fix_Budget_NUU" | "Fix_CPA_NUU" | "Fix_Budget_CPA"
  headcount: number
  outsource: number
  serverOverride: number
  customCosts: Record<string, number>
}

export interface GlobalSettings {
  taxRate: number
  refundRate: number
  ipRoyalty: number
  cpRoyalty: number
  opeRoyalty: number
  laborUnitCost: number
  serverCostRatio: number
  useServerRatio: boolean
  platforms: {
    ios: { share: number; fee: number }
    android: { share: number; fee: number }
    official: { share: number; fee: number }
  }
}

export type InterpolationMode = "linear_log" | "smart_curvature"

export interface RrModel {
  default: Record<number, number>
  overrides: Record<number, Record<number, number>>
  interpolationMode: InterpolationMode
}

export interface CustomCostItem {
  id: string
  name: string
  visible: boolean
  category: "outsourcing" | "biztrip" | "other" | "special" | "user-defined"
  specialType?: SpecialCostType
  removableType?: RemovableItemType
}

export interface PLData extends MonthlyData {
  dau: number
  // Gross Sales
  grossRevenue: number
  grossSalesIos: number
  grossSalesAndroid: number
  grossSalesOfficial: number
  // Deductions
  refund: number
  tax: number
  // Net Sales
  netSalesIos: number
  netSalesAndroid: number
  netSalesOfficial: number
  netSales: number
  // Royalties
  ipCost: number
  cpCost: number
  opeCost: number
  // Channel Fees
  channelFeeIos: number
  channelFeeAndroid: number
  channelFeeOfficial: number
  channelFee: number
  // CM1
  cm1: number
  cm1Ratio: number
  // Marketing
  marketingCost: number
  // CM2
  cm2: number
  cm2Ratio: number
  // Costs
  laborCost: number
  serverCost: number
  outsourceCost: number
  customTotal: number
  // Fixed Cost
  fc: number
  // Profit
  profit: number
  accProfit: number
}

export interface TimelineConfig {
  devStart: number
  opsEnd: number
}
