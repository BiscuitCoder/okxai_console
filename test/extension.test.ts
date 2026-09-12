// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
beforeEach(() => {
  document.body.innerHTML = "<header><nav></nav></header>";
  vi.resetModules();
  vi.stubGlobal("chrome", {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://demo/${path}`),
    },
  });
});
it("MV3 仅保留存储、本机只读桥接和 OKX.AI 站点权限", () => {
  const m = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  expect(m.manifest_version).toBe(3);
  expect(m.permissions).toEqual(["nativeMessaging", "storage"]);
  expect(m.permissions).not.toContain("cookies");
  expect(m.permissions).not.toContain("webRequest");
  expect(m.host_permissions).toEqual([
    "https://okx.ai/*",
    "https://www.okx.ai/*",
  ]);
  expect(m.content_security_policy.extension_pages).toContain(
    "connect-src 'none'",
  );
  expect(m.web_accessible_resources[0].resources).toEqual(["index.html"]);
  const background = readFileSync("src/background.ts", "utf8");
  expect(background).toContain("connectNative(nativeHost)");
  expect(background).not.toContain("sendNativeMessage");
});
it("非 OKX 页面不注入", async () => {
  await import("../src/content");
  expect(document.querySelector("#onchain-console-entry")).toBeNull();
});
it("OKX 中文页注入顶栏，SPA 重挂载仍只有一个入口", async () => {
  let observer: MutationObserver | undefined;
  const original = MutationObserver.prototype.observe;
  const spy = vi
    .spyOn(MutationObserver.prototype, "observe")
    .mockImplementation(function (this: MutationObserver, ...args) {
      observer = this;
      return original.apply(this, args);
    });
  vi.stubGlobal("location", new URL("https://www.okx.ai/zh-hans"));
  await import("../src/content");
  expect(
    document.querySelector("header nav #onchain-console-entry"),
  ).not.toBeNull();
  document.body.innerHTML = "<header><nav></nav></header>";
  await new Promise((r) => setTimeout(r, 40));
  expect(document.querySelectorAll("#onchain-console-entry")).toHaveLength(1);
  observer?.disconnect();
  spy.mockRestore();
  vi.unstubAllGlobals();
});
it("控制台路由只替换 404 内容区并保留官网框架", async () => {
  let observer: MutationObserver | undefined;
  const original = MutationObserver.prototype.observe;
  const spy = vi
    .spyOn(MutationObserver.prototype, "observe")
    .mockImplementation(function (this: MutationObserver, ...args) {
      observer = this;
      return original.apply(this, args);
    });
  vi.stubGlobal("location", new URL("https://www.okx.ai/_onchain-os-console"));
  document.body.innerHTML = `
    <header>OKX header</header>
    <main class="okx-ai-404-container"><div>404</div></main>
    <footer>OKX footer</footer>
  `;
  await import("../src/content");
  const host = document.querySelector<HTMLElement>("#onchain-console-page");
  expect(host).not.toBeNull();
  expect(host?.parentElement?.classList).toContain("okx-ai-404-container");
  expect(document.querySelector(".okx-ai-404-container")?.textContent).toBe("");
  expect(document.querySelector("header")?.textContent).toContain("OKX header");
  expect(
    document.querySelector("header #onchain-console-entry"),
  ).not.toBeNull();
  expect(document.querySelector("footer")?.textContent).toBe("OKX footer");
  expect(host?.shadowRoot).toBeNull();
  expect(host?.style.minHeight).toBe("560px");
  const source = readFileSync("src/content.ts", "utf8");
  expect(source).toContain("button.textContent = consoleLabel(");
  expect(source).toContain('"OPEN_TUTORIAL"');
  expect(source).toContain('["RESIZE", "OPEN_TUTORIAL"]');
  expect(source).not.toContain("100vh");
  observer?.disconnect();
  spy.mockRestore();
  vi.unstubAllGlobals();
});
