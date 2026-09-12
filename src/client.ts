import { LocalHistoryRepository, MockOnchainDataSource } from "./data";
import type { OperationDraft, OperationReceipt, Snapshot } from "./domain";

const extension = typeof chrome !== "undefined" && !!chrome.runtime?.id;
// 浏览器开发预览与扩展使用相同数据/仓储逻辑，但存储完全隔离。
const repository = new LocalHistoryRepository({
  getAll: async () =>
    JSON.parse(localStorage.getItem("onchain-demo-v1") ?? "{}"),
  set: async (key, value) => {
    const all = JSON.parse(localStorage.getItem("onchain-demo-v1") ?? "{}");
    all[key] = value;
    localStorage.setItem("onchain-demo-v1", JSON.stringify(all));
  },
});
const source = new MockOnchainDataSource(repository);
async function send<T>(message: object): Promise<T> {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok)
    throw new Error(result?.error ?? "后台连接失败，请重新加载扩展。");
  return result.data;
}
export const client = {
  snapshot: () =>
    extension ? send<Snapshot>({ type: "SNAPSHOT" }) : source.getSnapshot(),
  history: (accountId: string) =>
    extension
      ? send<OperationReceipt[]>({ type: "HISTORY", accountId })
      : repository.list(accountId),
  selected: () =>
    extension
      ? send<string | null>({ type: "SELECTED" })
      : repository.getSelectedAccount(),
  select: (accountId: string) =>
    extension
      ? send<void>({ type: "SELECT", accountId })
      : repository.selectAccount(accountId),
  rehearse: (draft: OperationDraft) =>
    extension
      ? send<OperationReceipt>({ type: "REHEARSE", draft, confirmed: true })
      : source.rehearse(draft, true),
};
