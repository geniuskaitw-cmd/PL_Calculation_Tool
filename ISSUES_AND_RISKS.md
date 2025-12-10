# 專案問題、風險與待辦事項

**報告日期:** 2025-12-10

## 1. 進行中的問題

### 1.1. AI 助理無法回應 (🔴 高風險)
*   **問題**：AI 聊天功能在前端發送訊息後，後端 API (`/api/chat`) 無法成功請求 OpenAI 服務並返回結果，導致 AI 無法進行任何對話或工具調用。
*   **根本原因**：OpenAI API 伺服器拒絕了請求，回報 `Invalid schema for function 'updateMonthlyPlan'` 錯誤。這表明我們傳遞給模型的工具定義 (Tool Definition) 不符合 OpenAI 的 Function Calling 格式要求。
*   **除錯過程與已嘗試的解決方案**：
    1.  **網路連線問題**：最初遇到 `ECONNRESET` 錯誤，已透過更新 API Key 及 Base URL 至官方 (`https://api.openai.com/v1`) 解決。
    2.  **前端請求格式**：確認前端 `useChat` hook 正確發送了 `{ messages: [...] }` 格式的請求 Body。
    3.  **後端 API 路由**：
        *   已移除 `convertToCoreMessages`，確認 `messages` 格式無誤。
        *   已將 `toDataStreamResponse()` 修正為 `toTextStreamResponse()` 以符合目前 `ai` SDK 版本。
    4.  **Schema 驗證**：多次嘗試簡化 `zod` schema，包括移除 `.describe()`、`.strict()`、將 `z.enum` 改為 `z.string`，但 `Invalid schema` 錯誤依然存在。
*   **目前推測**：
    *   `ai` SDK v5.x 在將 `zod` schema 自動轉換為 OpenAI Function Calling JSON schema 的過程中，可能存在 Bug 或與 `gpt-4o` 模型有不相容之處。
    *   `tool()` 輔助函數的內部實作可能產生了不正確的 JSON 結構。
*   **下一步**：
    *   手動構建符合 OpenAI 格式的 JSON schema 物件，繞過 `zod` 自動轉換，作為對照組進行測試。
    *   查閱 `ai` SDK 的 GitHub Issues，確認是否有相關問題回報。

## 2. 已解決的問題與技術債

### 2.1. [架構] 留存模型重構 (✅ 已解決)
*   **問題**：行業基準模型硬編碼在 TypeScript 檔案中，不利於維護且可能引發客戶端渲染問題。
*   **解決方案**：已將 6 種模型全部遷移至 `public/models/` 目錄下的獨立 JSON 檔案。前端改為使用 `fetch` 非同步載入，並統一了數據處理邏輯。

### 2.2. [Bug] 留存模型選擇崩潰 (✅ 已解決)
*   **問題**：在留存模型設定中，選擇任一基準模型都會導致 "Application error" 客戶端崩潰。
*   **解決方案**：
    1.  移除了會阻塞 UI 執行緒的 `window.confirm()` 對話框。
    2.  透過 `fetch` 載入數據的非同步流程，避免了在 React 渲染週期中直接操作大型物件。
    3.  為 `DropdownMenuItem` 的 `onSelect` 事件加入 `e.preventDefault()`，防止事件衝突。

### 2.3. [Bug] ROI 計算錯誤 (✅ 已解決)
*   **問題**：在累積淨利為負時，「全成本 ROI」顯示為 >100% 的錯誤數值。
*   **解決方案**：修正了 `components/kpi-dashboard.tsx` 中的 `calcRoi` 函數，確保「全成本」正確包含了市場費、渠道費、版稅與固定成本，且 ROI 公式改為 `累積淨利 / 全部成本`。

### 2.4. [Bug] 伺服器費用輸入無效 (✅ 已解決)
*   **問題**：當伺服器費用切換為金額模式時，在損益表中輸入的數值會被重置為 0。
*   **解決方案**：修正了 `components/income-table.tsx` 的邏輯，確保輸入框正確綁定並更新 `serverOverride` 狀態，而非唯讀的計算結果欄位。

## 2. 功能缺失與未來規劃

### 2.1. 「反推計算機 (Solver)」功能尚未實作
*   **問題**：專案目前只能進行「正向推算」(輸入參數 → 得到結果)，缺少了 TXT 版本中強大的「反向求解」功能 (輸入目標 → 反推參數)。
*   **潛在後果**：工具的決策輔助價值較低。使用者無法快速回答「若要達到 X 目標，我的 Y 參數最高/低能到多少？」這類關鍵問題。
*   **建議**：這是 AI 功能之外，另一個非常有價值的功能。在完成雲端存檔後，可以將其列為下一個主要開發目標。

### 2.2. 完整的 Supabase Auth UI
*   **問題**：目前僅規劃了 Supabase 的後端連接。完整的前端使用者體驗，包含：
    *   登入/註冊頁面
    *   忘記密碼流程
    *   個人資料頁面
    *   登出按鈕
    都尚未開發。
*   **潛在後果**：雲端存檔功能將無法使用，因為系統不知道是「誰」要存檔。
*   **建議**：這是下一步的開發重點，與建立資料表同步進行。

## 3. 風險評估

*   **API 成本風險**：OpenAI API 是按量計費的。若 AI 助理的使用量過於頻繁，或被濫用，可能會產生預期外的費用。
    *   **緩解措施**：在 OpenAI 後台設定預算限制與用量提醒。
*   **開發伺服器重啟**：當修改 `.env.local` 或 `next.config.mjs` 等核心設定檔時，需要手動重啟 `npm run dev` 伺服器，否則變更不會生效。
    *   **緩解措施**：我會確保在修改這些檔案後執行必要的重啟操作。