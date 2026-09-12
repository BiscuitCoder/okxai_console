import type {
  Account,
  ConsoleEvent,
  EventKind,
  HistoryRepository,
  OnchainDataSource,
  OperationDraft,
  OperationReceipt,
  Snapshot,
} from "./domain";

export function createDemoSnapshot(now = new Date()): Snapshot {
  const date = (days: number) =>
    new Date(now.getTime() - days * 86400000).toISOString();
  const address = "0x1111111111111111111111111111111111111111";
  const accounts: Account[] = [
    {
      id: "demo-radar",
      name: "SEO 雷达",
      address,
      description: "主运营账户 · 演示",
    },
    {
      id: "demo-lab",
      name: "探索实验室",
      address: "0x2222222222222222222222222222222222222222",
      description: "新账户 · 演示",
    },
  ];
  const definitions: [EventKind, string, string, number, string?, string?][] = [
    [
      "review",
      "SEORadar 上架申请",
      "待审核",
      0,
      undefined,
      "演示：已提交资料，等待平台审核。此状态不代表真实 OKX 账户。",
    ],
    [
      "review",
      "市场简报资料补充",
      "已驳回",
      2,
      undefined,
      "演示驳回原因：服务说明缺少参数规范与可运行的调用示例。",
    ],
    [
      "task",
      "网站 SEO 健康检查",
      "已完成",
      0,
      "0.01",
      "演示任务：example.com 页面基础标签检查。",
    ],
    [
      "invocation",
      "项目名称分析",
      "调用完成",
      0,
      "0.01",
      "演示 A2MCP 调用，仅用于预览界面。",
    ],
    ["task", "内容结构分析", "待处理", 1, "0.01"],
    ["task", "旧站迁移检查", "已取消", 10, "0.01"],
    ["subscription", "每周站点巡检", "进行中", 2, "0.30"],
    ["subscription", "月度内容报告", "已到期", 35, "0.20"],
    ["income", "SEO 检查服务收入", "已结算", 0, "0.01"],
    ["income", "SEO 检查服务收入", "已结算", 1, "0.01"],
    ["income", "评估奖励", "待领取", 3, "0.05"],
    [
      "arbitration",
      "报告交付争议",
      "待处理",
      1,
      "0.01",
      "演示争议：用户认为报告缺少语言标签建议；等待补充说明。无真实仲裁。",
    ],
    [
      "arbitration",
      "重复调用退款",
      "已关闭",
      9,
      "0.01",
      "演示：双方达成一致，模拟记录已关闭。",
    ],
    [
      "feedback",
      "报告清晰，建议可执行",
      "已评价",
      0,
      undefined,
      "演示评价：5 / 5；来自虚构调用账户。",
    ],
    [
      "feedback",
      "希望增加移动端建议",
      "已评价",
      4,
      undefined,
      "演示评价：4 / 5；来自虚构调用账户。",
    ],
    [
      "transaction",
      "演示充值",
      "已确认",
      5,
      "12.00",
      "虚构钱包事件；不是链上交易，不提供真实交易哈希。",
    ],
    ["transaction", "服务收款", "已确认", 0, "0.01"],
  ];
  const events: ConsoleEvent[] = definitions.map(
    ([kind, title, status, days, amount, detail], i) => ({
      id: `demo-event-${i}`,
      accountId: "demo-radar",
      kind,
      role:
        kind === "transaction"
          ? "User"
          : title === "评估奖励"
            ? "Evaluator"
            : "ASP",
      title,
      status,
      createdAt: date(days),
      amount,
      detail:
        detail ?? "模拟事件，仅用于演练筛选与运营流程；未从平台或链上获取。",
    }),
  );
  return {
    mode: "mock",
    capturedAt: now.toISOString(),
    accounts,
    wallets: accounts.map((a, i) => ({
      accountId: a.id,
      address: a.address,
      chain: "X Layer · 演示",
      totalUsd: i ? 0 : 12.48,
      assets: i
        ? []
        : [
            { symbol: "USDT", balance: "12.40", usd: 12.4 },
            { symbol: "OKB", balance: "0.001", usd: 0.08 },
          ],
    })),
    identities: [
      {
        id: "demo-user",
        accountId: "demo-radar",
        name: "radar-user",
        role: "User",
        status: "已注册",
        review: "不适用",
        online: true,
        address,
        rating: null,
        serviceIds: [],
      },
      {
        id: "demo-asp",
        accountId: "demo-radar",
        name: "SEO 雷达",
        role: "ASP",
        status: "已注册",
        review: "待审核",
        online: true,
        address,
        rating: 4.8,
        serviceIds: ["demo-seo", "demo-brief"],
      },
      {
        id: "demo-evaluator",
        accountId: "demo-radar",
        name: "Radar Evaluator",
        role: "Evaluator",
        status: "已注册",
        review: "不适用",
        online: false,
        address,
        rating: 4.9,
        serviceIds: [],
      },
    ],
    services: [
      {
        id: "demo-seo",
        accountId: "demo-radar",
        identityId: "demo-asp",
        name: "SEORadar · 网站 SEO 健康检查",
        type: "A2MCP",
        price: "0.01",
        endpoint: "https://seo.example.com/v1/seo-audit",
        description: "检查页面结构与基础 SEO 信息。",
        volume: 124,
        review: "待审核",
      },
      {
        id: "demo-brief",
        accountId: "demo-radar",
        identityId: "demo-asp",
        name: "市场简报 · 演示服务",
        type: "A2A",
        price: "0.02",
        endpoint: "https://brief.example.com/agent",
        description: "生成定期市场简报。",
        volume: 0,
        review: "已驳回",
      },
    ],
    events,
  };
}

export class MockOnchainDataSource implements OnchainDataSource {
  constructor(
    private repository: HistoryRepository,
    private snapshot = createDemoSnapshot(),
  ) {}
  async getSnapshot() {
    return structuredClone(this.snapshot);
  }
  async getAccounts() {
    return (await this.getSnapshot()).accounts;
  }
  async getWallet(id: string) {
    return (await this.getSnapshot()).wallets.find((w) => w.accountId === id);
  }
  async getIdentities(id: string) {
    return (await this.getSnapshot()).identities.filter(
      (i) => i.accountId === id,
    );
  }
  async getServices(id: string) {
    return (await this.getSnapshot()).services.filter(
      (s) => s.accountId === id,
    );
  }
  async getEvents(id: string, kind?: EventKind) {
    return (await this.getSnapshot()).events.filter(
      (e) => e.accountId === id && (!kind || e.kind === kind),
    );
  }
  async rehearse(draft: OperationDraft, confirmed: boolean) {
    if (!confirmed) throw new Error("请先核对确认卡，未确认的演练不能保存。");
    if (!draft || !this.snapshot.accounts.some((a) => a.id === draft.accountId))
      throw new Error("账户不存在。");
    const service = this.snapshot.services.find(
      (s) => s.id === draft.targetId && s.accountId === draft.accountId,
    );
    const reward = this.snapshot.events.find(
      (e) =>
        e.id === draft.targetId &&
        e.accountId === draft.accountId &&
        e.kind === "income" &&
        e.status === "待领取",
    );
    if (
      ![
        "price-update",
        "review-submit",
        "reward-claim",
        "service-update",
      ].includes(draft.kind) ||
      (draft.kind === "reward-claim" ? !reward : !service)
    )
      throw new Error("操作或目标无效。");
    if (
      typeof draft.value !== "string" ||
      !draft.value.trim() ||
      draft.value.length > 500
    )
      throw new Error("请填写有效内容（不超过 500 字）。");
    if (
      draft.kind === "price-update" &&
      (!/^\d+(\.\d{1,6})?$/.test(draft.value) || Number(draft.value) > 1000000)
    )
      throw new Error("价格必须是 0 至 1000000 的数值，最多 6 位小数。");
    if (draft.kind === "service-update") {
      try {
        const u = new URL(draft.value);
        if (u.protocol !== "https:" || u.username || u.password)
          throw new Error();
      } catch {
        throw new Error("Endpoint 必须是无账户密码的 HTTPS 地址。");
      }
    }
    if (draft.kind === "reward-claim" && draft.value !== reward?.amount)
      throw new Error("奖励金额与演示记录不一致。");
    const previous = (await this.repository.list(draft.accountId)).find(
      (r) => r.draft.id === draft.id,
    );
    if (previous) return previous;
    const receipt: OperationReceipt = {
      id: crypto.randomUUID(),
      draft: structuredClone(draft),
      completedAt: new Date().toISOString(),
      status: "simulated",
      externalEffect: false,
      message: "演练未执行：仅保存本地记录，未提交到 OKX/链上。",
    };
    await this.repository.append(receipt);
    return receipt;
  }
}

// 数据键按操作 ID 分离，避免多个面板覆盖彼此的历史；不存储密钥。
export interface KeyValueStorage {
  getAll(): Promise<Record<string, unknown>>;
  set(key: string, value: unknown): Promise<void>;
}
export class LocalHistoryRepository implements HistoryRepository {
  constructor(private storage: KeyValueStorage) {}
  async list(accountId: string) {
    return Object.entries(await this.storage.getAll())
      .filter(([k]) => k.startsWith("receipt:"))
      .map(([, v]) => v as OperationReceipt)
      .filter((r) => r.draft.accountId === accountId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }
  async append(receipt: OperationReceipt) {
    await this.storage.set(`receipt:${receipt.draft.id}`, receipt);
  }
  async getSelectedAccount() {
    return ((await this.storage.getAll()).selectedAccount as string) ?? null;
  }
  async selectAccount(id: string) {
    await this.storage.set("selectedAccount", id);
  }
}

export function filterEvents(
  events: ConsoleEvent[],
  role: string,
  status: string,
  days: number,
  now = Date.now(),
) {
  return events.filter(
    (e) =>
      (role === "all" || e.role === role) &&
      (status === "all" || e.status === status) &&
      (!days || new Date(e.createdAt).getTime() >= now - days * 86400000),
  );
}
