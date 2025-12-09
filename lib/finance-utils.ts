import {
  type MonthlyData,
  type GlobalSettings,
  type RrModel,
  type CustomCostItem,
  type PLData,
  type RemovableItemType,
  RR_DAYS,
  type InterpolationMode,
} from "./finance-types"

export const getUniformWeights = () => new Array(30).fill(100 / 30)

export function createMonthRow(label: string, idx: number, isDev: boolean): MonthlyData {
  return {
    id: Math.random().toString(36).substr(2, 9),
    monthLabel: label,
    monthIndex: idx,
    isDev,
    nuu: 0,
    marketing: 0,
    ecpa: 4.0,
    arpdau: 0.15,
    strategy: "avg",
    customDailyWeights: getUniformWeights(),
    calcMode: "Fix_Budget_NUU",
    headcount: 5,
    outsource: 0,
    serverOverride: 0,
    customCosts: {},
  }
}

export function generateTimeline(devStart: number, opsEnd: number, oldTimeline: MonthlyData[] = []): MonthlyData[] {
  const rows: MonthlyData[] = []
  const findExisting = (idx: number) => oldTimeline.find((r) => r.monthIndex === idx)

  for (let i = devStart; i >= 1; i--) {
    const idx = -i
    const existing = findExisting(idx)
    rows.push(existing || createMonthRow(`M-${i}`, idx, true))
  }

  const m0 = findExisting(0)
  rows.push(m0 || createMonthRow("M0", 0, true))

  for (let i = 1; i <= opsEnd; i++) {
    const idx = i
    const existing = findExisting(idx)
    rows.push(existing || createMonthRow(`M${i}`, idx, false))
  }

  return rows
}

// 智能曲率繼承算法 (Smart Curvature Inheritance)
// 移植自 TXT 版本
function buildRRWithCurvatureInheritance(
  knownDays: number[],
  knownMap: Record<number, number>,
  maxDay: number,
  minRetentionPct = 0.01,
): number[] {
  const days = [...knownDays].sort((a, b) => a - b)
  // minRetentionPct is in %, so 0.01 means 0.01%
  // But knownMap values are in %. So we keep everything in %.
  // TXT logic uses 0~1 for values. Our system uses 0~100.
  // We will adapt the algorithm to use 0~100.
  const minRetention = minRetentionPct

  if (days.length < 1) return new Array(maxDay + 1).fill(0)

  const rr = new Array(maxDay + 1).fill(0)
  rr[0] = 100

  for (let day = 1; day <= maxDay; day++) {
    if (days.includes(day)) {
      rr[day] = knownMap[day]
    } else {
      let leftDay = 0
      let rightDay = maxDay + 1
      let leftValue = 100
      let rightValue = minRetention

      for (const d of days) {
        if (d < day && d > leftDay) {
          leftDay = d
          leftValue = knownMap[d]
        }
        if (d > day && d < rightDay) {
          rightDay = d
          rightValue = knownMap[d]
        }
      }

      if (leftDay > 0 && rightDay <= maxDay) {
        // Interpolation between two anchors
        const t = (day - leftDay) / (rightDay - leftDay)
        const linearInterp = leftValue + t * (rightValue - leftValue)
        
        // Use log interpolation if values are positive
        const valL = Math.max(leftValue, 1e-10)
        const valR = Math.max(rightValue, 1e-10)
        
        const logLeft = Math.log(valL)
        const logRight = Math.log(valR)
        const logInterpolated = Math.exp(logLeft + t * (logRight - logLeft))
        
        // Weighting based on value magnitude (heuristic from TXT)
        // Values in TXT were 0-1. Here 0-100.
        // TXT: logWeight = Math.min(0.8, Math.max(0.2, leftValue * rightValue * 2));
        // Equivalent for %: leftValue/100 * rightValue/100 * 2
        const weightFactor = (valL / 100) * (valR / 100) * 2
        const logWeight = Math.min(0.8, Math.max(0.2, weightFactor))
        
        rr[day] = logWeight * logInterpolated + (1 - logWeight) * linearInterp

      } else if (leftDay > 0) {
        // Extrapolation after last anchor
        const lastDays = days.slice(-Math.min(3, days.length))
        if (lastDays.length >= 2) {
          let avgDecayRate = 0
          let validRates = 0

          for (let i = 1; i < lastDays.length; i++) {
            const d1 = lastDays[i - 1]
            const d2 = lastDays[i]
            const v1 = knownMap[d1]
            const v2 = knownMap[d2]
            if (v1 > 0 && v2 > 0) {
              avgDecayRate += Math.log(v1 / v2) / (d2 - d1)
              validRates++
            }
          }

          if (validRates > 0) {
            avgDecayRate /= validRates
            // Clamp decay rate (TXT used 0.02 for 0-1 scale, seems day-based decay const)
            // It's rate per day, so scale doesn't matter much for log(ratio)
            avgDecayRate = Math.min(avgDecayRate, 0.02)

            const lastDay = days[days.length - 1]
            const lastValue = knownMap[lastDay]
            const distanceFromLast = day - lastDay
            const damping = Math.exp(-distanceFromLast / 100)
            const extrapolated = lastValue * Math.exp(-avgDecayRate * distanceFromLast * damping)
            const finalMin = Math.max(minRetention, lastValue * 0.1) // Don't drop below 10% of last anchor too fast
            rr[day] = Math.max(finalMin, extrapolated)
          } else {
             rr[day] = Math.max(minRetention, rr[day - 1] * 0.99)
          }
        } else {
             // Only 1 anchor available for tail
             rr[day] = Math.max(minRetention, rr[day - 1] * 0.99)
        }
      } else {
        // Before first anchor (should be covered by 0 -> firstAnchor interpolation)
        // But logic above handles leftDay=0 case for 0->firstAnchor
        // Wait, if day < first anchor, leftDay is 0, leftValue is 100. rightDay is firstAnchor.
        // So it enters the first block.
      }
    }

    // Clamp
    rr[day] = Math.max(minRetention, Math.min(100, rr[day]))

    // Monotonicity check (heuristic)
    if (day > 1 && rr[day] > rr[day - 1] * 1.1) {
      rr[day] = Math.min(rr[day], rr[day - 1] * 1.05)
    }
  }

  return rr
}

export function getDailyCurve(points: Record<number, number>, mode: InterpolationMode = "linear_log"): number[] {
  const MAX_DAYS = 721
  
  // 找出有有效值的錨點 (> 0)
  const anchors = RR_DAYS.filter((d) => points[d] > 0).sort((a, b) => a - b)
  
  if (mode === "smart_curvature") {
     return buildRRWithCurvatureInheritance(anchors, points, MAX_DAYS - 1)
  }

  // Fallback to original linear/log interpolation
  const daily = new Array(MAX_DAYS).fill(0)
  daily[0] = 100

  // 如果沒有錨點，返回全部為 0 的曲線（除了 day 0）
  if (anchors.length === 0) {
    return daily
  }

  // 如果只有一個錨點，從 day 0 線性衰減到該錨點，然後保持
  if (anchors.length === 1) {
    const d1 = anchors[0]
    const v1 = points[d1]
    // day 0 到 d1 線性插值
    for (let d = 1; d < d1; d++) {
      daily[d] = 100 - (100 - v1) * (d / d1)
    }
    daily[d1] = v1
    // d1 之後保持最後的值（或衰減到最小值）
    for (let d = d1 + 1; d < MAX_DAYS; d++) {
      daily[d] = Math.max(v1 * 0.99, 0.01) // 緩慢衰減
    }
    return daily
  }

  // 有多個錨點，進行插值
  // 先處理 day 0 到第一個錨點
  const firstAnchor = anchors[0]
  const firstVal = points[firstAnchor]
  for (let d = 1; d < firstAnchor; d++) {
    daily[d] = 100 - (100 - firstVal) * (d / firstAnchor)
  }
  daily[firstAnchor] = firstVal

  // 錨點之間進行對數插值
  for (let i = 0; i < anchors.length - 1; i++) {
    const d1 = anchors[i]
    const d2 = anchors[i + 1]
    const v1 = points[d1]
    const v2 = points[d2]

    if (v1 > 0 && v2 > 0) {
      const slope = Math.log(v2 / v1) / Math.log(d2 / d1)
      for (let d = d1 + 1; d < d2; d++) {
        daily[d] = v1 * Math.pow(d / d1, slope)
      }
    } else {
      // 線性插值
      for (let d = d1 + 1; d < d2; d++) {
        daily[d] = v1 + (v2 - v1) * ((d - d1) / (d2 - d1))
      }
    }
    daily[d2] = v2
  }

  // 最後一個錨點之後，使用衰減趨勢延伸
  const lastAnchor = anchors[anchors.length - 1]
  const lastVal = points[lastAnchor]
  const secondLastAnchor = anchors.length > 1 ? anchors[anchors.length - 2] : 1
  const secondLastVal = anchors.length > 1 ? points[secondLastAnchor] : 100 // Should not happen if anchors > 1

  // 計算尾部斜率
  let tailSlope = -0.5 // 預設衰減率
  if (lastVal > 0 && secondLastVal > 0 && lastAnchor > secondLastAnchor) {
    tailSlope = Math.log(lastVal / secondLastVal) / Math.log(lastAnchor / secondLastAnchor)
  }

  for (let d = lastAnchor + 1; d < MAX_DAYS; d++) {
    let val = lastVal * Math.pow(d / lastAnchor, tailSlope)
    if (val > lastVal) val = lastVal
    if (val < 0.01) val = 0.01
    daily[d] = val
  }

  return daily
}

export function calculateLTV(rrModel: RrModel, arpdau: number, days = 90, monthIndex: number | null = null): number {
  const points = monthIndex !== null && rrModel.overrides[monthIndex] ? rrModel.overrides[monthIndex] : rrModel.default
  const dailyCurve = getDailyCurve(points, rrModel.interpolationMode)

  let totalRetentionDays = 0
  for (let d = 0; d < days; d++) {
    // 留存率是百分比，需要除以 100
    const retentionRate = dailyCurve[d] / 100
    totalRetentionDays += retentionRate
  }

  // LTV = ARPDAU × 累積留存天數
  return totalRetentionDays * arpdau
}

export function calculateMetrics(
  timeline: MonthlyData[],
  rrModel: RrModel,
): (MonthlyData & { dau: number; grossRevenue: number })[] {
  const globalDaily = getDailyCurve(rrModel.default, rrModel.interpolationMode)
  const monthlyCurves: Map<number, number[]> = new Map()
  timeline.forEach((m) => {
    if (rrModel.overrides[m.monthIndex]) {
      monthlyCurves.set(m.monthIndex, getDailyCurve(rrModel.overrides[m.monthIndex], rrModel.interpolationMode))
    }
  })

  const opsStartIndex = timeline.findIndex((m) => !m.isDev)

  return timeline.map((currentMonth, mIdx) => {
    if (currentMonth.isDev) {
      return { ...currentMonth, dau: 0, grossRevenue: 0 }
    }

    let totalDAU = 0
    let monthRevenue = 0

    for (let dayOfCurrentMonth = 1; dayOfCurrentMonth <= 30; dayOfCurrentMonth++) {
      let dayDAU = 0

      for (let prevIdx = opsStartIndex; prevIdx <= mIdx; prevIdx++) {
        const cohort = timeline[prevIdx]
        if (cohort.nuu <= 0) continue

        const dailyCurve = monthlyCurves.get(cohort.monthIndex) || globalDaily

        const weights = cohort.strategy === "avg" ? getUniformWeights() : cohort.customDailyWeights

        for (let installDay = 1; installDay <= 30; installDay++) {
          const dailyInstalls = cohort.nuu * (weights[installDay - 1] / 100)
          const monthGap = mIdx - prevIdx
          const age = monthGap * 30 + (dayOfCurrentMonth - installDay)

          if (age >= 0) {
            const rate = age >= dailyCurve.length ? 0.01 / 100 : dailyCurve[age] / 100
            dayDAU += dailyInstalls * rate
          }
        }
      }

      totalDAU += dayDAU
      monthRevenue += dayDAU * currentMonth.arpdau
    }

    const avgDAU = Math.round(totalDAU / 30)
    return { ...currentMonth, dau: avgDAU, grossRevenue: monthRevenue }
  })
}

export function calculatePLData(
  calculatedMetrics: (MonthlyData & { dau: number; grossRevenue: number })[],
  settings: GlobalSettings,
  customCostItems: CustomCostItem[],
  removedItems: RemovableItemType[] = [],
): PLData[] {
  let accProfit = 0

  return calculatedMetrics.map((row) => {
    const grossRevenue = row.grossRevenue
    const p = settings.platforms

    const iosAndroidTotal = p.ios.share + p.android.share
    const iosShareNorm = iosAndroidTotal > 0 ? p.ios.share / iosAndroidTotal : 0.5
    const androidShareNorm = iosAndroidTotal > 0 ? p.android.share / iosAndroidTotal : 0.5

    const grossSalesIos = grossRevenue * iosShareNorm
    const grossSalesAndroid = grossRevenue * androidShareNorm
    const grossSalesOfficial = 0

    const refund = removedItems.includes("refund") ? 0 : grossRevenue * (settings.refundRate / 100)
    const tax = removedItems.includes("tax") ? 0 : grossRevenue * (settings.taxRate / 100)

    const netMultiplier =
      1 -
      (removedItems.includes("refund") ? 0 : settings.refundRate / 100) -
      (removedItems.includes("tax") ? 0 : settings.taxRate / 100)
    const netSalesIos = grossSalesIos * netMultiplier
    const netSalesAndroid = grossSalesAndroid * netMultiplier
    const netSalesOfficial = 0
    const netSales = netSalesIos + netSalesAndroid

    const ipCost = removedItems.includes("ipCost") ? 0 : netSales * (settings.ipRoyalty / 100)
    const cpCost = removedItems.includes("cpCost") ? 0 : netSales * (settings.cpRoyalty / 100)
    const opeCost = 0

    const channelFeeIos = removedItems.includes("channelFeeIos") ? 0 : netSalesIos * (p.ios.fee / 100)
    const channelFeeAndroid = removedItems.includes("channelFeeAndroid") ? 0 : netSalesAndroid * (p.android.fee / 100)
    const channelFeeOfficial = 0
    const channelFee = channelFeeIos + channelFeeAndroid

    const cm1 = netSales - ipCost - cpCost - channelFee
    const cm1Ratio = netSales > 0 ? (cm1 / netSales) * 100 : 0

    const marketingCost = removedItems.includes("marketingCost") ? 0 : row.marketing

    const cm2 = cm1 - marketingCost
    const cm2Ratio = netSales > 0 ? (cm2 / netSales) * 100 : 0

    const laborCost = removedItems.includes("laborCost") ? 0 : row.headcount * settings.laborUnitCost

    const serverCost = removedItems.includes("serverCost")
      ? 0
      : settings.useServerRatio
        ? grossRevenue * (settings.serverCostRatio / 100)
        : row.serverOverride

    let outsourceCost = 0
    let customTotal = 0

    customCostItems.forEach((c) => {
      if (!c.visible) return
      const val = row.customCosts[c.id] || 0
      customTotal += val
      if (c.category === "outsourcing") {
        outsourceCost += val
      }
    })

    const fc = laborCost + serverCost + customTotal

    const profit = cm2 - fc
    accProfit += profit

    return {
      ...row,
      grossSalesIos,
      grossSalesAndroid,
      grossSalesOfficial,
      refund,
      tax,
      netSalesIos,
      netSalesAndroid,
      netSalesOfficial,
      netSales,
      ipCost,
      cpCost,
      opeCost,
      channelFeeIos,
      channelFeeAndroid,
      channelFeeOfficial,
      channelFee,
      cm1,
      cm1Ratio,
      marketingCost,
      cm2,
      cm2Ratio,
      laborCost,
      serverCost,
      outsourceCost,
      customTotal,
      fc,
      profit,
      accProfit,
    }
  })
}

export function interpolateRR(
  rrModel: RrModel,
  editingMonthIdx: number | null,
  setRrModel: (fn: (prev: RrModel) => RrModel) => void,
): string | null {
  const target = editingMonthIdx === null ? rrModel.default : rrModel.overrides[editingMonthIdx]
  const newCurve = { ...target } as Record<number, number>
  const anchors = RR_DAYS.filter((d) => newCurve[d] > 0).sort((a, b) => a - b)

  if (anchors.length < 2) {
    return "請至少填寫兩個有效點 (例如 Day 1 和 Day 30) 以進行補間"
  }

  const MIN_RETENTION = 0.01

  for (let i = 0; i < anchors.length - 1; i++) {
    const d1 = anchors[i],
      d2 = anchors[i + 1]
    const v1 = newCurve[d1],
      v2 = newCurve[d2]
    const slope = Math.log(v2 / v1) / Math.log(d2 / d1)
    RR_DAYS.filter((d) => d > d1 && d < d2).forEach((d) => {
      let val = v1 * Math.pow(d / d1, slope)
      if (val < MIN_RETENTION) val = MIN_RETENTION
      newCurve[d] = Number.parseFloat(val.toFixed(2))
    })
  }

  const lastDay = anchors[anchors.length - 1]
  const secondLastDay = anchors[anchors.length - 2]
  const lastVal = newCurve[lastDay]
  const secondLastVal = newCurve[secondLastDay]
  const tailSlope = Math.log(lastVal / secondLastVal) / Math.log(lastDay / secondLastDay)

  RR_DAYS.filter((d) => d > lastDay).forEach((d) => {
    let val = lastVal * Math.pow(d / lastDay, tailSlope)
    if (val > lastVal) val = lastVal
    if (val < MIN_RETENTION) val = MIN_RETENTION
    newCurve[d] = Number.parseFloat(val.toFixed(2))
  })

  if (editingMonthIdx === null) {
    setRrModel((p) => ({ ...p, default: newCurve }))
  } else {
    setRrModel((p) => ({ ...p, overrides: { ...p.overrides, [editingMonthIdx]: newCurve } }))
  }

  return null
}

export function calculateNetLTV(
  rrModel: RrModel,
  arpdau: number,
  channelFeeRatio: number,
  days = 90,
  monthIndex: number | null = null,
): number {
  const points = monthIndex !== null && rrModel.overrides[monthIndex] ? rrModel.overrides[monthIndex] : rrModel.default
  const dailyCurve = getDailyCurve(points, rrModel.interpolationMode)

  let totalRetentionDays = 0
  for (let d = 0; d < days; d++) {
    const retentionRate = dailyCurve[d] / 100
    totalRetentionDays += retentionRate
  }

  const netArpdau = arpdau * (1 - channelFeeRatio)
  return totalRetentionDays * netArpdau
}
