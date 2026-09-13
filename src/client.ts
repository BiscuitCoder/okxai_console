import { LocalHistoryRepository, MockOnchainDataSource } from "./data";
import type { OperationDraft, OperationReceipt, Snapshot } from "./domain";

const extension = typeof chrome !== "undefined" && !!chrome.runtime?.id;
export const localWeb =
  !extension &&
  document
    .querySelector('meta[name="onchain-mode"]')
    ?.getAttribute("content") === "local-web";
const storageKey = localWeb ? "onchain-web-v1" : "onchain-demo-v1";
if (localWeb && location.hash.startsWith("#token=")) {
  sessionStorage.setItem("onchain-web-token", location.hash.slice(7));
  window.history.replaceState(null, "", location.pathname + location.search);
}
async function webSnapshot(): Promise<Snapshot> {
  const response = await fetch("/api/snapshot", {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("onchain-web-token") ?? ""}`,
    },
  });
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error(result.error ?? "本机数据查询失败");
  return result.data;
}
// 浏览器开发预览与扩展使用相同数据/仓储逻辑，但存储完全隔离。
const repository = new LocalHistoryRepository({
  getAll: async () => JSON.parse(localStorage.getItem(storageKey) ?? "{}"),
  set: async (key, value) => {
    const all = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    all[key] = value;
    localStorage.setItem(storageKey, JSON.stringify(all));
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
    extension
      ? send<Snapshot>({ type: "SNAPSHOT" })
      : localWeb
        ? webSnapshot()
        : source.getSnapshot(),
  history: (accountId: string) =>
    extension
      ? send<OperationReceipt[]>({ type: "HISTORY", accountId })
      : localWeb
        ? Promise.resolve([] as OperationReceipt[])
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
      : localWeb
        ? Promise.reject(
            new Error("真实数据模式当前只读，未执行任何外部操作。"),
          )
        : source.rehearse(draft, true),
};
