import { describe, it, expect } from "vitest";
import {
  createDemoSnapshot,
  filterEvents,
  LocalHistoryRepository,
  MockOnchainDataSource,
} from "../src/data";
import { isConsoleUrl, isTargetUrl } from "../src/scope";
import type { OperationDraft } from "../src/domain";
function setup() {
  const values: Record<string, unknown> = {};
  const repo = new LocalHistoryRepository({
    getAll: async () => structuredClone(values),
    set: async (k, v) => {
      values[k] = structuredClone(v);
    },
  });
  return {
    repo,
    source: new MockOnchainDataSource(
      repo,
      createDemoSnapshot(new Date("2026-09-12T00:00:00Z")),
    ),
  };
}
const draft: OperationDraft = {
  id: "test-draft",
  accountId: "demo-radar",
  kind: "price-update",
  targetId: "demo-seo",
  value: "0.03",
  createdAt: "2026-09-12T00:00:00Z",
};
describe("模拟数据边界", () => {
  it("包含全部领域事件，账户与角色正确隔离", async () => {
    const { source } = setup();
    expect(await source.getAccounts()).toHaveLength(2);
    expect(await source.getIdentities("demo-radar")).toHaveLength(3);
    expect(await source.getServices("demo-lab")).toEqual([]);
    expect(await source.getEvents("demo-lab")).toEqual([]);
    expect(
      new Set((await source.getEvents("demo-radar")).map((e) => e.kind)).size,
    ).toBe(8);
    expect((await source.getWallet("demo-lab"))?.totalUsd).toBe(0);
  });
  it("返回快照副本，调用方不能修改数据源", async () => {
    const { source } = setup();
    (await source.getSnapshot()).services[0].price = "99";
    expect((await source.getServices("demo-radar"))[0].price).toBe("0.01");
  });
  it("未经确认不能留档", async () => {
    const { source, repo } = setup();
    await expect(source.rehearse(draft, false)).rejects.toThrow("确认");
    expect(await repo.list(draft.accountId)).toEqual([]);
  });
  it("保存演练回执，但不修改服务、钱包或审核状态", async () => {
    const { source, repo } = setup();
    const before = await source.getSnapshot();
    const result = await source.rehearse(draft, true);
    expect(result.externalEffect).toBe(false);
    expect(result.message).toContain("未提交到 OKX/链上");
    expect(await source.getSnapshot()).toEqual(before);
    expect(await repo.list("demo-radar")).toHaveLength(1);
    expect(await repo.list("demo-lab")).toEqual([]);
  });
  it("同一草稿重试幂等", async () => {
    const { source, repo } = setup();
    const first = await source.rehearse(draft, true);
    expect(await source.rehearse(draft, true)).toEqual(first);
    expect(await repo.list("demo-radar")).toHaveLength(1);
  });
  it.each(["-1", "NaN", "1e2", "0.0000001", "1000001", ""])(
    "拒绝无效价格 %s",
    async (value) => {
      await expect(
        setup().source.rehearse({ ...draft, value }, true),
      ).rejects.toThrow();
    },
  );
  it("允许免费和六位小数价格", async () => {
    const { source } = setup();
    await expect(
      source.rehearse({ ...draft, value: "0" }, true),
    ).resolves.toHaveProperty("status", "simulated");
    await expect(
      source.rehearse({ ...draft, id: "six", value: "0.000001" }, true),
    ).resolves.toHaveProperty("status", "simulated");
  });
  it("拒绝跨账户操作", async () => {
    await expect(
      setup().source.rehearse({ ...draft, accountId: "demo-lab" }, true),
    ).rejects.toThrow("目标");
  });
  it("支持所有操作类型及 HTTPS 校验", async () => {
    const { source, repo } = setup();
    await source.rehearse(
      { ...draft, id: "review", kind: "review-submit", value: "补充服务说明" },
      true,
    );
    await source.rehearse(
      {
        ...draft,
        id: "service",
        kind: "service-update",
        value: "https://demo.example.com/api",
      },
      true,
    );
    const reward = (await source.getEvents("demo-radar", "income")).find(
      (e) => e.status === "待领取",
    )!;
    await source.rehearse(
      {
        ...draft,
        id: "reward",
        kind: "reward-claim",
        targetId: reward.id,
        value: reward.amount!,
      },
      true,
    );
    expect(await repo.list("demo-radar")).toHaveLength(3);
    await expect(
      source.rehearse(
        { ...draft, kind: "service-update", value: "http://example.com" },
        true,
      ),
    ).rejects.toThrow("HTTPS");
    await expect(
      source.rehearse(
        {
          ...draft,
          kind: "service-update",
          value: "https://user:pass@example.com",
        },
        true,
      ),
    ).rejects.toThrow("HTTPS");
  });
  it("拒绝篡改奖励金额", async () => {
    const { source } = setup();
    const reward = (await source.getEvents("demo-radar", "income")).find(
      (e) => e.status === "待领取",
    )!;
    await expect(
      source.rehearse(
        { ...draft, kind: "reward-claim", targetId: reward.id, value: "500" },
        true,
      ),
    ).rejects.toThrow("金额");
  });
  it("角色、状态和时间筛选", async () => {
    const events = await setup().source.getEvents("demo-radar");
    const filtered = filterEvents(
      events,
      "ASP",
      "已结算",
      7,
      Date.parse("2026-09-12T00:00:00Z"),
    );
    expect(filtered).toHaveLength(2);
    expect(filterEvents(events, "User", "待审核", 0)).toHaveLength(0);
  });
  it("账户偏好与历史可跨 repository 实例恢复", async () => {
    const values: Record<string, unknown> = {};
    const storage = {
      getAll: async () => values,
      set: async (k: string, v: unknown) => {
        values[k] = v;
      },
    };
    const r = new LocalHistoryRepository(storage);
    await r.selectAccount("demo-lab");
    await new MockOnchainDataSource(r).rehearse(draft, true);
    const reopened = new LocalHistoryRepository(storage);
    expect(await reopened.getSelectedAccount()).toBe("demo-lab");
    expect(await reopened.list("demo-radar")).toHaveLength(1);
  });
});
describe("站点范围", () => {
  it.each(["https://www.okx.ai/zh-hans", "https://okx.ai/"])("允许 %s", (url) =>
    expect(isTargetUrl(url)).toBe(true),
  );
  it.each([
    "https://okx.ai.evil.com/",
    "http://okx.ai/",
    "https://other.okx.ai/",
    "https://example.com/",
    "https://okx.ai:8443/",
    "invalid",
  ])("拒绝 %s", (url) => expect(isTargetUrl(url)).toBe(false));
  it.each([
    "https://www.okx.ai/_onchain-os-console",
    "https://okx.ai/_onchain-os-console/",
  ])("识别控制台路由 %s", (url) => expect(isConsoleUrl(url)).toBe(true));
  it.each([
    "https://www.okx.ai/zh-hans",
    "https://www.okx.ai/_onchain-os-console/other",
    "https://okx.ai.evil.com/_onchain-os-console",
  ])("不接管非控制台路由 %s", (url) => expect(isConsoleUrl(url)).toBe(false));
});
