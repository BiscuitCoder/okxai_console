// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("chrome", undefined);
  localStorage.clear();
  sessionStorage.clear();
  document.head.innerHTML = '<meta name="onchain-mode" content="local-web">';
  window.history.replaceState(null, "", "/#token=test-session");
});
afterEach(() => vi.unstubAllGlobals());

it("uses the web session for real data and does not expose demo history or operations", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { mode: "live" } }),
    });
  vi.stubGlobal("fetch", fetch);
  const { client } = await import("../src/client");
  expect(location.hash).toBe("");
  expect(sessionStorage.getItem("onchain-web-token")).toBe("test-session");
  expect(await client.snapshot()).toEqual({ mode: "live" });
  expect(fetch).toHaveBeenCalledWith("/api/snapshot", {
    headers: { Authorization: "Bearer test-session" },
  });
  expect(await client.history("account")).toEqual([]);
  await client.select("account");
  expect(localStorage.getItem("onchain-demo-v1")).toBeNull();
  expect(await client.selected()).toBe("account");
  await expect(client.rehearse({} as never)).rejects.toThrow("只读");
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ ok: false, error: "登录失效" }),
  });
  await expect(client.snapshot()).rejects.toThrow("登录失效");
});

it("keeps the extension on native messaging and normal development on mock data", async () => {
  vi.stubGlobal("chrome", {
    runtime: {
      id: "extension",
      sendMessage: vi.fn(async () => ({ ok: true, data: { mode: "live" } })),
    },
  });
  let { client } = await import("../src/client");
  await client.snapshot();
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "SNAPSHOT" });
  vi.resetModules();
  vi.stubGlobal("chrome", undefined);
  document.head.innerHTML = "";
  ({ client } = await import("../src/client"));
  expect((await client.snapshot()).mode).toBe("mock");
});
