import { LocalHistoryRepository, MockOnchainDataSource } from "./data";
import type { Snapshot } from "./domain";
import { isConsoleUrl } from "./scope";

const repository = new LocalHistoryRepository({
  getAll: () => chrome.storage.local.get(null),
  set: async (key, value) => {
    await chrome.storage.local.set({ [key]: value });
  },
});
const demoSource = new MockOnchainDataSource(repository);
const nativeHost = "com.okx.onchain_console";
let latestSnapshot: Snapshot | undefined;
let nativePort: chrome.runtime.Port | undefined;
const nativeRequests = new Map<
  string,
  {
    resolve: (snapshot: Snapshot) => void;
    reject: (error: Error) => void;
  }
>();

function connectNative() {
  if (nativePort) return nativePort;
  const port = chrome.runtime.connectNative(nativeHost);
  nativePort = port;
  port.onMessage.addListener((response) => {
    const request = nativeRequests.get(response?.requestId);
    if (!request) return;
    nativeRequests.delete(response.requestId);
    if (response.ok) request.resolve(response.data as Snapshot);
    else request.reject(new Error(response.error ?? "本机数据查询失败。"));
  });
  port.onDisconnect.addListener(() => {
    const detail = chrome.runtime.lastError?.message;
    if (nativePort === port) nativePort = undefined;
    const error = new Error(
      `无法连接本机数据服务，请运行 npm run companion:install 后重新加载扩展。${detail ? `（${detail}）` : ""}`,
    );
    nativeRequests.forEach(({ reject }) => reject(error));
    nativeRequests.clear();
  });
  return port;
}

async function getSnapshot(): Promise<Snapshot> {
  const requestId = crypto.randomUUID();
  latestSnapshot = await new Promise<Snapshot>((resolve, reject) => {
    nativeRequests.set(requestId, { resolve, reject });
    try {
      connectNative().postMessage({
        version: 1,
        requestId,
        method: "snapshot",
      });
    } catch (error) {
      nativeRequests.delete(requestId);
      nativePort = undefined;
      reject(error);
    }
  });
  return latestSnapshot;
}
void chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  // 仅专用 OKX.AI 路由中的扩展页面可以读写本地演练数据。
  if (
    sender.url !== chrome.runtime.getURL("index.html") ||
    !isConsoleUrl(sender.tab?.url ?? "")
  )
    return;
  const run = async () => {
    switch (message?.type) {
      case "SNAPSHOT":
        return getSnapshot();
      case "HISTORY":
        return repository.list(message.accountId);
      case "SELECTED":
        return repository.getSelectedAccount();
      case "SELECT":
        if (
          !(latestSnapshot ?? (await getSnapshot())).accounts.some(
            (account) => account.id === message.accountId,
          )
        )
          throw new Error("账户不存在");
        return repository.selectAccount(message.accountId);
      case "REHEARSE":
        if (latestSnapshot?.mode === "live")
          throw new Error("真实数据模式当前只读，未执行任何外部操作。");
        return demoSource.rehearse(message.draft, message.confirmed === true);
      default:
        throw new Error("不支持的请求");
    }
  };
  run().then(
    (data) => reply({ ok: true, data }),
    (error) =>
      reply({
        ok: false,
        error: error instanceof Error ? error.message : "本地操作失败",
      }),
  );
  return true;
});
