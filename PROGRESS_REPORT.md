# 專案開發進度報告

**報告日期:** 2025-12-10（最後更新）

## 1. 整體進度

專案已完成 **AI 功能與雲端化** 的核心實現，成功將應用程式從靜態計算器升級為具備 **AI 自動填表能力** 的智慧財務 SaaS 應用。

### 主要里程碑
- ✅ **Phase 1**: 雲端化基礎建設（環境配置完成）
- ✅ **Phase 2**: AI 基礎建設與對話功能
- ✅ **Phase 3**: AI Tool Calling 自動填表功能
- 🟡 **Phase 4**: 雲端存檔功能（待實作）

---

## 2. AI 助手完整技術架構

### 2.1 技術棧總覽

#### 核心 SDK 與版本
```json
{
  "ai": "^3.3.44",                    // Vercel AI SDK (降級至 v3.x)
  "openai-edge": "^1.2.2",            // OpenAI Edge Runtime 適配器
  "@ai-sdk/openai": "^2.0.80",        // OpenAI SDK 整合（後端）
  "@supabase/supabase-js": "^2.87.0"  // 雲端資料庫（未來使用）
}
```

#### AI 模型
- **模型**: `gpt-4o` (OpenAI 最新旗艦模型)
- **API 端點**: `https://api.openai.com/v1`
- **功能**: Function Calling（工具調用）、Streaming（串流回應）

### 2.2 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                    用戶端 (Browser)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  components/ai-chat-modal.tsx                         │  │
│  │  - useChat() from "ai/react"                          │  │
│  │  - 處理用戶輸入與訊息顯示                                │  │
│  │  - 監聽 Function Call 並執行工具                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓↑ HTTP POST/Stream                │
└─────────────────────────────────────────────────────────────┘
                           ↓↑
┌─────────────────────────────────────────────────────────────┐
│               Next.js Edge Runtime (Vercel)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  app/api/chat/route.ts                                │  │
│  │  - Edge Runtime (超低延遲)                             │  │
│  │  - 接收前端訊息                                         │  │
│  │  - 注入 System Prompt                                  │  │
│  │  - 定義 3 個 Function Tools                            │  │
│  │  - 使用 OpenAI Stream API                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓↑ HTTPS                           │
└─────────────────────────────────────────────────────────────┘
                           ↓↑
┌─────────────────────────────────────────────────────────────┐
│                   OpenAI API (GPT-4o)                       │
│  - Function Calling 決策                                     │
│  - 自然語言理解                                               │
│  - 工具選擇與參數生成                                          │
│  - 串流返回結果                                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                前端 React Context (State)                    │
│  lib/finance-context.tsx                                     │
│  - updateMonth(): 更新月度計劃                               │
│  - setRrModel(): 更新留存曲線                                │
│  - 即時更新 UI 表格                                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 資料流程

#### 完整對話流程
```
1. 用戶輸入: "請幫我把 M1 的預算設為 100萬"
   ↓
2. 前端 useChat 發送 HTTP POST → /api/chat
   Body: { messages: [{ role: "user", content: "..." }] }
   ↓
3. 後端 Edge Function 處理:
   a. 注入 System Prompt (AI 知識庫)
   b. 附加 3 個 Function 定義
   c. 調用 OpenAI API (gpt-4o)
   ↓
4. OpenAI 決策:
   a. 理解用戶意圖
   b. 選擇工具: updateMonthlyPlan
   c. 生成參數: { monthIndex: 1, field: "marketing", value: 1000000 }
   d. 返回 Function Call JSON
   ↓
5. 前端接收 Stream Response:
   a. 檢測到 function_call
   b. 解析參數
   c. 執行 updateMonth(id, "marketing", 1000000)
   d. 顯示確認訊息: "✅ 已完成！成功更新..."
   ↓
6. UI 即時更新: 表格中 M1 的預算欄位變為 1,000,000
```

### 2.4 核心檔案說明

#### 後端 API (`app/api/chat/route.ts`)
```typescript
// 技術要點：
- Runtime: Edge Runtime (低延遲、全球部署)
- SDK: openai-edge + ai v3.3
- Function Calling: 3 個工具定義
  1. updateMonthlyPlan: 更新月度參數
  2. updateRetention: 更新留存曲線
  3. applyPreset: 套用行業模型
- Streaming: 使用 OpenAIStream + StreamingTextResponse
```

#### 前端組件 (`components/ai-chat-modal.tsx`)
```typescript
// 技術要點：
- Hook: useChat from "ai/react"
- 狀態管理: React Context (FinanceContext)
- 工具執行: 監聽 messages 變化，檢測 function_call
- 防重複: 使用 useRef 記錄已處理的 toolCallId
- UX 優化: 
  - 過濾 JSON 代碼顯示
  - 綠色確認訊息
  - Toast 通知
```

#### AI 知識庫 (`lib/ai/system-prompt.ts`)
```typescript
// 包含：
- 遊戲財務專業知識
- 行業基準數據 (RPG, SLG, Casual)
- 計算邏輯說明
- 工具使用指南
- 合理性約束
```

### 2.5 已實現的 AI 功能

#### ✅ 基本對話
- 自然語言理解
- 上下文記憶
- 專業知識問答

#### ✅ 自動填表（Tool Calling）
支援的操作：
1. **更新月度參數**
   - 範例：「請幫我把 M2 的預算設為 200萬」
   - 工具：`updateMonthlyPlan(monthIndex, field, value)`
   - 支援欄位：NUU、Marketing（預算）、ARPDAU、ECPA

2. **更新留存曲線**
   - 範例：「把 Day 1 留存設為 40%」
   - 工具：`updateRetention(day, value)`
   - 支援錨點：Day 1, 3, 7, 14, 30, 60, 90, 180

3. **套用行業模型**
   - 範例：「套用 RPG 遊戲的留存模型」
   - 工具：`applyPreset(modelId)`
   - 支援模型：A~F (SLG High/Low, RPG, Casual, etc.)

#### 🟡 規劃中功能
- 多步驟推理（設定目標 → AI 自動調整多個參數）
- 財務分析與建議
- 情境模擬與比較

---

## 3. 2025-12-10 最新更新

### 3.1 AI 功能突破性進展

#### ✅ 問題：AI 完全無回應
- **根本原因**：
  1. 缺少 `.env.local` 環境變數檔案
  2. AI SDK 版本衝突（v5.x 與 v3.x API 不相容）
  3. `useChat` 導入路徑錯誤

#### ✅ 解決方案
1. **環境配置**
   - 創建 `.env.local` 並配置 OpenAI API Key
   - 創建 `.env.example` 作為部署範本

2. **依賴版本調整**
   ```bash
   # 從
   ai@5.0.108 + @ai-sdk/react@2.0.109
   # 降級到
   ai@3.3.44 + openai-edge@1.2.2
   ```

3. **導入路徑修正**
   ```typescript
   // 錯誤
   import { useChat } from "ai"
   import { useChat } from "@ai-sdk/react"
   
   // 正確 (ai v3.3)
   import { useChat } from "ai/react"
   ```

4. **後端 API 重構**
   - 改用 Edge Runtime
   - 手動構建 Function 定義（JSON Schema）
   - 使用 `openai-edge` 的 `Configuration` + `OpenAIApi`

5. **前端工具執行優化**
   - 實現 `handleFunctionCall()` 函數
   - 添加防重複執行機制
   - 過濾顯示 JSON 代碼
   - 自動添加確認訊息

### 3.2 用戶體驗優化
- ✅ 隱藏 Function Call 的 JSON 代碼閃爍
- ✅ 執行後顯示綠色確認訊息
- ✅ Toast 通知操作結果
- ✅ 優化載入狀態提示

### 3.3 部署配置
- ✅ 已部署至 Vercel Production
- ✅ 環境變數已在 Vercel 後台設定
- ✅ `.gitignore` 正確配置（不上傳 `.env.local`）
- ✅ `.env.example` 提供部署指南

---

## 4. 技術債與已知問題

### 4.1 AI 功能限制
1. **多步驟推理未完善**
   - 目前 AI 主要執行單一操作
   - 複雜目標（如「24個月賺800萬」）需要多輪對話
   - 建議：實作規劃模式，讓 AI 一次調整多個參數

2. **工具覆蓋不完整**
   - 尚未支援：calcMode 切換、時間軸調整、自定義成本
   - 建議：逐步擴充工具定義

3. **錯誤處理待加強**
   - 當參數超出合理範圍時缺少驗證
   - 建議：添加參數邊界檢查

### 4.2 性能考量
- Edge Runtime 提供極低延遲
- 但每次 API 調用都消耗 Token（成本考量）
- 建議：監控 API 使用量，必要時設定限制

---

## 5. 下一步計畫

### 優先級 1: 增強 AI 能力
1. 實作多步驟規劃模式
2. 添加更多工具（calcMode、自定義成本等）
3. 實現財務分析與建議功能

### 優先級 2: 雲端存檔功能
1. 建立 Supabase 資料表結構
2. 實作使用者驗證 (Auth)
3. 串接存檔/讀取 API

### 優先級 3: 進階功能
1. 反推計算機 (Solver)
2. 情境模擬與比較
3. 導出報告功能

---

## 6. 團隊協作指南

### 本地開發設定
1. Clone repository
2. 複製 `.env.example` 為 `.env.local`
3. 填入您的 OpenAI API Key
4. 執行 `npm install`
5. 執行 `npm run dev`

### 部署到 Vercel
1. 連接 GitHub repository
2. 在 Vercel 專案設定中添加環境變數：
   - `OPENAI_API_KEY`
   - `OPENAI_BASE_URL`
3. 自動部署完成

---

**專案狀態**: 🟢 AI 核心功能已完成並上線
**下一個里程碑**: 雲端存檔功能實作
