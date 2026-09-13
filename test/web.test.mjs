import { afterEach, expect, it, vi } from "vitest";
import { request } from "node:http";
import { startServer } from "../web.mjs";

const servers = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(resolve);
          server.closeAllConnections();
        }),
    ),
  );
});
async function start(
  getSnapshot = vi.fn(async () => ({ mode: "live", accounts: [] })),
) {
  const instance = await startServer({ getSnapshot });
  servers.push(instance.server);
  const url = new URL(instance.url);
  return {
    ...instance,
    origin: url.origin,
    headers: { Authorization: `Bearer ${url.hash.slice(7)}` },
    getSnapshot,
  };
}

it("serves the real web entry and all bundled assets, but not extension or source files", async () => {
  const { origin, server } = await start();
  expect(server.address().address).toBe("127.0.0.1");
  const html = await (await fetch(origin)).text();
  expect(html).toContain('content="local-web"');
  expect(html).not.toContain("· 演示");
  for (const [, path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    expect((await fetch(new URL(path, origin))).status, path).toBe(200);
  }
  for (const path of [
    "/companion.mjs",
    "/background.js",
    "/manifest.json",
    "/assets/%2e%2e%2f%2e%2e%2fpackage.json",
  ]) {
    expect((await fetch(origin + path)).status, path).toBe(404);
  }
});

it("requires a session token, validates browser origin, and blocks writes or custom commands", async () => {
  const { origin, headers, getSnapshot } = await start();
  expect((await fetch(origin + "/api/snapshot")).status).toBe(401);
  expect(
    (
      await fetch(origin + "/api/snapshot", {
        headers: { Authorization: "Bearer invalid" },
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await fetch(origin + "/api/snapshot", {
        headers: { ...headers, Origin: "https://evil.example" },
      })
    ).status,
  ).toBe(403);
  expect(
    (await fetch(origin + "/api/snapshot", { headers, method: "POST" })).status,
  ).toBe(405);
  expect(
    (await fetch(origin + "/api/snapshot?command=wallet", { headers })).status,
  ).toBe(404);
  const hostStatus = await new Promise((resolve) => {
    request(
      origin + "/api/snapshot",
      { headers: { ...headers, Host: "evil.example" } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    ).end();
  });
  expect(hostStatus).toBe(403);
  expect(getSnapshot).not.toHaveBeenCalled();
  const response = await fetch(origin + "/api/snapshot", {
    headers: { ...headers, Origin: origin },
  });
  expect(await response.json()).toEqual({
    ok: true,
    data: { mode: "live", accounts: [] },
  });
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
});

it("coalesces simultaneous snapshot queries and surfaces failures without a mock fallback", async () => {
  let finish;
  const getSnapshot = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { origin, headers } = await start(getSnapshot);
  const requests = [
    fetch(origin + "/api/snapshot", { headers }),
    fetch(origin + "/api/snapshot", { headers }),
  ];
  await vi.waitFor(() => expect(getSnapshot).toHaveBeenCalledTimes(1));
  finish({ mode: "live" });
  const results = await Promise.all(requests);
  expect(results.every((result) => result.ok)).toBe(true);
  expect(getSnapshot).toHaveBeenCalledTimes(1);
  getSnapshot.mockRejectedValueOnce(new Error("secret internal detail"));
  const failed = await fetch(origin + "/api/snapshot", { headers });
  expect(failed.status).toBe(500);
  expect(await failed.text()).not.toContain("secret internal detail");
});
