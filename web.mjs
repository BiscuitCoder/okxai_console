#!/usr/bin/env node
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { dirname, join, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { snapshot } from "./companion.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "dist-web");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

export async function startServer({ port = 0, getSnapshot = snapshot } = {}) {
  const html = (await readFile(join(root, "index.html"), "utf8"))
    .replace("<head>", '<head><meta name="onchain-mode" content="local-web">')
    .replace("Onchain OS Console · 演示", "Onchain OS Console");
  const token = randomBytes(32).toString("hex");
  let origin;
  let pending;
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://static.okx.com https://static.oklink.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    const reply = (status, body, type = "application/json; charset=utf-8") => {
      res.writeHead(status, { "Content-Type": type });
      res.end(
        typeof body === "object" && !Buffer.isBuffer(body)
          ? JSON.stringify(body)
          : body,
      );
    };
    if (
      req.headers.host !== new URL(origin).host ||
      (req.headers.origin && req.headers.origin !== origin) ||
      req.headers["sec-fetch-site"] === "cross-site"
    ) {
      return reply(403, { ok: false, error: "禁止跨站访问" });
    }
    if (req.method !== "GET")
      return reply(405, { ok: false, error: "仅支持只读请求" });
    try {
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith("/api/")) {
        if (req.headers.authorization !== `Bearer ${token}`)
          return reply(401, {
            ok: false,
            error: "访问凭证已失效，请打开终端提供的完整地址。",
          });
        if (url.pathname !== "/api/snapshot" || url.search)
          return reply(404, { ok: false, error: "不支持的请求" });
        pending ??= Promise.resolve()
          .then(getSnapshot)
          .finally(() => {
            pending = undefined;
          });
        return reply(200, { ok: true, data: await pending });
      }
      if (url.pathname === "/" || url.pathname === "/index.html")
        return reply(200, html, mime[".html"]);
      const pathname = decodeURIComponent(url.pathname);
      if (
        !/^\/(assets|icons)\//.test(pathname) &&
        !["/product-icon.png", "/sidepanel.js"].includes(pathname)
      )
        return reply(404, "Not found", "text/plain");
      const path = await realpath(resolve(root, `.${pathname}`));
      if (!path.startsWith(root + sep) || !mime[extname(path)])
        return reply(404, "Not found", "text/plain");
      return reply(200, await readFile(path), mime[extname(path)]);
    } catch (error) {
      if (error.code === "ENOENT" || error instanceof URIError)
        return reply(404, "Not found", "text/plain");
      return reply(500, {
        ok: false,
        error: "本机数据查询失败，请检查 OnchainOS CLI 后重试。",
      });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, url: `${origin}/#token=${token}` };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "Usage: okx-onchain-console [--port 0-65535] [--no-open]\n默认自动选择空闲端口并打开浏览器。需要 Node.js 22.14+ 和已登录的 OnchainOS CLI。",
    );
    return;
  }
  let port = 0;
  let open = true;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--no-open") open = false;
    else if (args[i] === "--port" && /^\d+$/.test(args[i + 1] ?? "")) {
      port = Number(args[++i]);
      if (port > 65535) throw new Error("端口必须在 0–65535 之间");
    } else throw new Error(`不支持的参数：${args[i]}，使用 --help 查看帮助`);
  }
  const { server, url } = await startServer({ port });
  console.log(
    `Onchain OS Console\n${url}\n仅本机访问 · 只读模式 · Ctrl+C 停止服务`,
  );
  if (open) {
    const command =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "rundll32.exe"
          : "xdg-open";
    const child = spawn(
      command,
      process.platform === "win32"
        ? ["url.dll,FileProtocolHandler", url]
        : [url],
      { stdio: "ignore" },
    );
    child.on("error", () =>
      console.error("无法自动打开浏览器，请手动打开上方地址。"),
    );
    child.on("exit", (code) => {
      if (code) console.error("请手动打开上方地址。");
    });
    child.unref();
  }
  const stop = () => {
    server.close();
    server.closeAllConnections();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

if (
  process.argv[1] &&
  (await realpath(process.argv[1])) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(
      error.code === "ENOENT"
        ? "缺少 Web 构建文件，请先运行 npm run build:web。"
        : error.message,
    );
    process.exitCode = 1;
  });
}
