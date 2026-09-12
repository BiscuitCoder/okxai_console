export type UiLocale = "zh-Hans" | "zh-Hant" | "en";

function localeCookie(cookie: string) {
  const match = cookie.match(/(?:^|;\s*)locale=([^;]*)/i);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function detectLocale(language = "", path = "", cookie = ""): UiLocale {
  const signal = `${localeCookie(cookie)} ${language} ${path}`.toLowerCase();
  if (/zh[-_]?(hant|tw|hk|mo)|zh-hant/.test(signal)) return "zh-Hant";
  if (/^en|\/en(?:\/|$)/.test(signal)) return "en";
  return "zh-Hans";
}

export function localeFromDocument(): UiLocale {
  const queryLocale = new URLSearchParams(location.search).get("locale");
  return detectLocale(
    document.documentElement.lang,
    location.pathname,
    queryLocale ? `locale=${queryLocale}` : document.cookie,
  );
}

export const copy = {
  "zh-Hans": {
    pages: [
      "总览",
      "身份与审核",
      "服务",
      "调用与任务",
      "钱包与流水",
      "争议与评价",
      "操作记录",
      "设置",
    ],
    console: "控制台",
    loading: "正在加载…",
    reload: "重新加载",
    registrationTitle: "需要先注册身份",
    registrationBody:
      "当前账户尚未完成 OKX.AI 身份注册。完成注册后，控制台会显示与你账户关联的 Agent、服务和活动数据。",
    registrationAction: "前往注册教程",
    registrationHint: "注册完成后，返回此页并刷新数据。",
    connection: "需连接",
    live: "实时",
    demo: "演示",
    account: "切换账户",
    refresh: "刷新数据",
    navigation: "主导航",
    readonly: "数据来自本机 OnchainOS 与 OKX.AI，只读展示。",
    mock: "所有数据均为模拟，不会提交到 OKX 或链上。",
    close: "关闭",
    roleFilter: "角色筛选",
    allRoles: "全部角色",
    statusFilter: "状态筛选",
    allStatus: "全部状态",
    timeRange: "时间范围",
    allTime: "全部时间",
    recent7: "近 7 天",
    recent30: "近 30 天",
    walletTotal: "钱包总资产",
    addressUnavailable: "地址未提供",
    viewWallet: "查看钱包",
    identities: "Agent 身份",
    attention: "待处理事项",
    services: "ASP 服务",
    identityWorkspace: "身份工作区",
    manageIdentities: "管理身份",
    items: (count: number) => `${count} 项`,
    empty: "暂无匹配记录，试试调整筛选条件。",
  },
  "zh-Hant": {
    pages: [
      "總覽",
      "身份與審核",
      "服務",
      "調用與任務",
      "錢包與流水",
      "爭議與評價",
      "操作記錄",
      "設定",
    ],
    console: "控制台",
    loading: "正在載入…",
    reload: "重新載入",
    registrationTitle: "需要先註冊身份",
    registrationBody:
      "目前帳戶尚未完成 OKX.AI 身份註冊。完成註冊後，控制台會顯示與帳戶相關的 Agent、服務和活動資料。",
    registrationAction: "前往註冊教學",
    registrationHint: "完成註冊後，返回此頁並重新整理資料。",
    connection: "需要連線",
    live: "即時",
    demo: "示範",
    account: "切換帳戶",
    refresh: "重新整理資料",
    navigation: "主導覽",
    readonly: "資料來自本機 OnchainOS 與 OKX.AI，僅供檢視。",
    mock: "所有資料均為模擬，不會提交到 OKX 或鏈上。",
    close: "關閉",
    roleFilter: "角色篩選",
    allRoles: "全部角色",
    statusFilter: "狀態篩選",
    allStatus: "全部狀態",
    timeRange: "時間範圍",
    allTime: "所有時間",
    recent7: "近 7 天",
    recent30: "近 30 天",
    walletTotal: "錢包總資產",
    addressUnavailable: "未提供地址",
    viewWallet: "查看錢包",
    identities: "Agent 身份",
    attention: "待處理事項",
    services: "ASP 服務",
    identityWorkspace: "身份工作區",
    manageIdentities: "管理身份",
    items: (count: number) => `${count} 項`,
    empty: "暫無相符記錄，請嘗試調整篩選條件。",
  },
  en: {
    pages: [
      "Overview",
      "Identities",
      "Services",
      "Calls & tasks",
      "Wallet",
      "Disputes",
      "Activity",
      "Settings",
    ],
    console: "Console",
    loading: "Loading…",
    reload: "Reload",
    registrationTitle: "Register an identity first",
    registrationBody:
      "This account has not completed OKX.AI identity registration. Once registered, the console can show the Agents, services, and activity associated with it.",
    registrationAction: "Open registration tutorial",
    registrationHint: "Return to this page and refresh after registration.",
    connection: "Connection needed",
    live: "Live",
    demo: "Demo",
    account: "Switch account",
    refresh: "Refresh data",
    navigation: "Main navigation",
    readonly: "Read-only data from local OnchainOS and OKX.AI.",
    mock: "All data is simulated and is never submitted to OKX or onchain.",
    close: "Close",
    roleFilter: "Role",
    allRoles: "All roles",
    statusFilter: "Status",
    allStatus: "All statuses",
    timeRange: "Time range",
    allTime: "All time",
    recent7: "Last 7 days",
    recent30: "Last 30 days",
    walletTotal: "Total wallet value",
    addressUnavailable: "Address unavailable",
    viewWallet: "View wallet",
    identities: "Agent identities",
    attention: "Needs attention",
    services: "ASP services",
    identityWorkspace: "Identity workspace",
    manageIdentities: "Manage identities",
    items: (count: number) => `${count} items`,
    empty: "No matching records. Try adjusting the filters.",
  },
} as const;

export const tutorialUrl = "https://www.okx.ai/zh-hant/tutorial";

export function consoleLabel(locale: UiLocale) {
  return `${copy[locale].console} ↗`;
}

const labels: Partial<Record<UiLocale, Record<string, string>>> = {
  "zh-Hant": {
    需要关注: "需要關注",
    最近操作: "最近操作",
    全部记录: "所有記錄",
    上架审核: "上架審核",
    运行状态: "運行狀態",
    评分: "評分",
    "关联服务：": "關聯服務：",
    "累计成交：": "累計成交：",
    资产: "資產",
    全部: "全部",
    条记录: "條記錄",
    连接与数据: "連線與資料",
    数据源: "資料來源",
    "本机 Companion": "本機 Companion",
    历史存储: "歷史儲存",
    浏览器本地: "瀏覽器本機",
    数据状态: "資料狀態",
    数据可用性: "資料可用性",
    隐私边界: "私隱邊界",
    在线: "在線",
    离线: "離線",
    暂无: "暫無",
    无: "無",
  },
  en: {
    需要关注: "Needs attention",
    最近操作: "Recent activity",
    全部记录: "All activity",
    上架审核: "Approval",
    运行状态: "Runtime status",
    评分: "Rating",
    "关联服务：": "Linked services: ",
    "累计成交：": "Completed sales: ",
    资产: "Assets",
    全部: "All",
    条记录: "records",
    连接与数据: "Connection & data",
    数据源: "Data source",
    "本机 Companion": "Local companion",
    历史存储: "History storage",
    浏览器本地: "Browser local",
    数据状态: "Data status",
    数据可用性: "Data availability",
    隐私边界: "Privacy boundaries",
    在线: "Online",
    离线: "Offline",
    暂无: "Not available",
    无: "None",
  },
};

export function translate(locale: UiLocale, value: string) {
  return labels[locale]?.[value] ?? value;
}
