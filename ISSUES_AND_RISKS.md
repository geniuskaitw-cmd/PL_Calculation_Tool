# 專案問題、風險與待辦事項

**報告日期:** 2025-12-10（最後更新）

---

## 1. 已解決的重大問題

### 1.1. [AI] AI 助理完全無回應 (✅ 已解決)

#### 問題描述
AI 聊天功能在前端發送訊息後，後端 API 無法成功請求 OpenAI 服務，導致：
- 前端按鈕點擊無反應
- F12 Console Network 無請求記錄
- 或有請求但返回錯誤

#### 根本原因分析
1. **環境變數缺失** (最嚴重)
   - 缺少 `.env.local` 檔案
   - `OPENAI_API_KEY` 未設定
   - 導致後端無法連接 OpenAI API

2. **SDK 版本衝突**
   - 專案使用 `ai@5.0.108` + `@ai-sdk/react@2.0.109`
   - v5.x 版本的 API 與 v3.x 完全不相容
   - `useChat` hook 的返回值結構不同
   - Function Calling 的處理方式改變

3. **導入路徑錯誤**
   - 嘗試從 `ai` 或 `@ai-sdk/react` 導入 `useChat`
   - 實際在 ai v3.3 中應該從 `ai/react` 導入

4. **Function Calling Schema 問題**
   - 最初使用 Zod schema 定義工具
   - ai SDK v5.x 的 `tool()` 輔助函數與 OpenAI API 不相容
   - 產生 `Invalid schema` 錯誤

#### 解決方案

**第一步：環境配置**
```bash
# 創建 .env.local
OPENAI_API_KEY=sk-proj-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
```

**第二步：SDK 降級**
```bash
npm uninstall @ai-sdk/react
npm install ai@^3.3 openai-edge
```

**最終版本：**
- `ai@3.3.44`
- `openai-edge@1.2.2`
- `@ai-sdk/openai@2.0.80` (僅後端使用)

**第三步：修正導入路徑**
```typescript
// components/ai-chat-modal.tsx
import { useChat } from "ai/react"  // ✅ 正確
```

**第四步：重構後端 API**
```typescript
// app/api/chat/route.ts
import { Configuration, OpenAIApi } from "openai-edge"
import { OpenAIStream, StreamingTextResponse } from "ai"

// 手動構建 Function 定義（JSON Schema 格式）
const functions = [
  {
    name: "updateMonthlyPlan",
    description: "...",
    parameters: {
      type: "object",
      properties: { ... },
      required: ["monthIndex", "field", "value"]
    }
  }
]

// 使用 Edge Runtime
export const runtime = "edge"
```

**第五步：前端工具執行**
```typescript
// 監聽 messages 變化，檢測 function_call
useEffect(() => {
  const lastMessage = messages[messages.length - 1]
  if (lastMessage.content.includes("function_call")) {
    const parsed = JSON.parse(lastMessage.content)
    handleFunctionCall(parsed.function_call)
  }
}, [messages])
```

#### 驗證結果
- ✅ 基本對話功能正常
- ✅ Function Calling 工具調用成功
- ✅ 表格自動更新
- ✅ 用戶體驗流暢

#### 學到的教訓
1. **版本管理很重要**：大版本升級（v3→v5）可能完全改變 API
2. **環境變數是基礎**：沒有 API Key 什麼都做不了
3. **官方文件要仔細看**：不同版本的使用方式差異很大
4. **降級不丟臉**：穩定性 > 新版本

---

## 2. 其他已解決的問題

### 2.1. [架構] 留存模型重構 (✅ 已解決)
- **問題**：硬編碼在 TypeScript 中，維護困難
- **解決**：遷移至 `public/models/*.json`，使用 fetch 動態載入

### 2.2. [Bug] 留存模型選擇崩潰 (✅ 已解決)
- **問題**：選擇模型時 "Application error"
- **解決**：移除 `window.confirm()`，改為非同步載入

### 2.3. [Bug] ROI 計算錯誤 (✅ 已解決)
- **問題**：負淨利時顯示 >100% ROI
- **解決**：修正公式為 `累積淨利 / 全部成本`

### 2.4. [Bug] 伺服器費用輸入無效 (✅ 已解決)
- **問題**：金額模式時輸入被重置
- **解決**：修正綁定邏輯

### 2.5. [UX] JSON 代碼閃爍 (✅ 已解決)
- **問題**：Function Call 的 JSON 在對話框中閃過
- **解決**：過濾顯示，只顯示確認訊息

---

## 3. 當前已知問題與限制

### 3.1. AI 功能限制

#### 🟡 多步驟推理不完善
- **現狀**：AI 目前主要執行單一操作
- **問題**：複雜目標（如「24個月賺800萬」）需要多輪對話手動調整
- **影響**：用戶體驗不夠智慧化
- **建議方案**：
  1. 實作「規劃模式」：AI 先制定計劃，展示給用戶確認
  2. 一次調用多個工具
  3. 添加 `maxSteps` 配置允許多步推理

#### 🟡 工具覆蓋不完整
- **缺少的功能**：
  - calcMode 切換（Fix_Budget_NUU / Fix_CPA_NUU / Fix_Budget_CPA）
  - 時間軸調整（devStart, opsEnd）
  - 自定義成本項目
  - 平台分成比例
  - 批量操作（如「把所有月份的 ARPDAU 設為 X」）
- **優先級**：中
- **建議**：按使用頻率逐步添加

#### 🟡 參數驗證不足
- **問題**：AI 可能設定不合理的值
  - 例如：留存率 > 100%、負數 NUU、極端 ARPDAU
- **影響**：數據可靠性
- **建議方案**：
  ```typescript
  // 在 handleFunctionCall 中添加驗證
  if (field === "value" && (value < 0 || value > 100)) {
    toast.error("留存率必須在 0-100% 之間")
    return
  }
  ```

### 3.2. 性能與成本

#### ⚠️ API 成本風險
- **現狀**：每次對話調用 OpenAI API，按 Token 計費
- **風險因素**：
  1. GPT-4o 成本較高（$0.03/1K tokens）
  2. System Prompt 較長（約 500 tokens）
  3. Function Calling 返回需要額外 tokens
  4. 多輪對話累積消耗
- **預估成本**：
  - 單次對話：約 0.05-0.1 USD
  - 100 次對話：約 5-10 USD
- **緩解措施**：
  1. ✅ 在 OpenAI 後台設定每月額度上限
  2. 🟡 考慮添加本地快取常見問題
  3. 🟡 實作使用次數限制（需要 Auth）
  4. 🟡 考慮降級至 GPT-3.5-turbo（成本降低 10 倍）

#### 🟢 Edge Runtime 優勢
- **延遲**：平均 < 500ms（全球部署）
- **可靠性**：Vercel 的 99.99% SLA
- **成本**：Vercel 免費額度充足（100GB-hours/月）

### 3.3. 安全性考量

#### 🟡 API Key 暴露風險
- **現狀**：Key 儲存在 Vercel 環境變數中（安全）
- **風險**：所有訪客共用 Owner 的 API 額度
- **潛在問題**：
  1. 惡意用戶大量調用
  2. 意外流量激增導致超額費用
- **建議方案**：
  - **短期**：監控用量，設定告警
  - **中期**：添加速率限制（Rate Limiting）
  - **長期**：實作使用者自帶 Key 模式

#### 🟡 資料隱私
- **現狀**：用戶輸入會發送到 OpenAI
- **風險**：敏感財務數據可能被記錄
- **建議**：在 UI 明確告知使用者

---

## 4. 未來規劃與待辦

### 4.1. AI 能力增強（優先級：高）
- [ ] 實作多步驟規劃模式
- [ ] 添加更多工具定義（calcMode、批量操作等）
- [ ] 實現財務分析與建議功能
- [ ] 添加參數驗證與邊界檢查
- [ ] 優化 System Prompt（減少 token 消耗）

### 4.2. 雲端存檔功能（優先級：高）
- [ ] 建立 Supabase 資料表結構
  - `profiles`: 用戶資料
  - `projects`: 專案存檔
  - `templates`: 自定義模板
- [ ] 實作使用者驗證（Email + Google）
- [ ] 串接存檔/讀取 API
- [ ] 實作「我的專案」列表頁面
- [ ] 添加分享功能

### 4.3. 進階功能（優先級：中）
- [ ] 反推計算機（Solver）
- [ ] 情境模擬與比較
- [ ] 導出 Excel/PDF 報告
- [ ] 圖表視覺化增強

### 4.4. 開發體驗優化（優先級：低）
- [ ] 添加單元測試
- [ ] CI/CD 自動化
- [ ] 錯誤監控（Sentry）
- [ ] 性能監控（Vercel Analytics）

---

## 5. 技術債務追蹤

### 高優先級
1. **AI 多步驟推理**：影響核心價值主張
2. **參數驗證**：影響數據可靠性
3. **API 成本監控**：財務風險

### 中優先級
1. **工具定義擴充**：提升功能完整度
2. **錯誤處理**：提升穩定性
3. **速率限制**：防止濫用

### 低優先級
1. **代碼重構**：優化可維護性
2. **測試覆蓋**：長期品質保障
3. **文件完善**：團隊協作

---

## 6. 風險矩陣

| 風險項 | 機率 | 影響 | 等級 | 緩解措施 |
|--------|------|------|------|----------|
| API 成本超支 | 中 | 高 | 🟡 | 設定額度上限、監控告警 |
| OpenAI 服務中斷 | 低 | 高 | 🟡 | 添加錯誤處理、顯示友好訊息 |
| 惡意濫用 | 中 | 中 | 🟡 | 添加速率限制、使用者認證 |
| 資料遺失 | 低 | 高 | 🟡 | 實作雲端存檔（進行中） |
| 瀏覽器相容性 | 低 | 低 | 🟢 | 使用標準 Web API |

---

## 7. 發布檢查清單

### 上線前必檢項目
- [x] 環境變數已在 Vercel 設定
- [x] API Key 有效且額度充足
- [x] `.env.local` 不在 Git 中
- [x] `.env.example` 已提供
- [x] 錯誤處理完善
- [x] 基本功能測試通過
- [ ] 設定 OpenAI 額度上限
- [ ] 添加使用條款說明
- [ ] 設定 Google Analytics（可選）

### 持續監控項目
- [ ] OpenAI API 用量
- [ ] Vercel 部署狀態
- [ ] 錯誤日誌
- [ ] 使用者回饋

---

**當前風險等級**: 🟡 中等（主要為成本風險，技術風險已解決）
**建議行動**: 設定 OpenAI 額度上限，實作基本的使用監控