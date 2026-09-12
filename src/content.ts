import { CONSOLE_PATH, isConsoleUrl, isTargetUrl } from "./scope";

function installConsoleEntry(current: boolean) {
  const host = document.createElement("span");
  host.id = "onchain-console-entry";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent =
    ':host{display:inline-flex;flex:0 0 auto;margin-inline:12px;align-self:center;z-index:1000}button{font:500 14px "PingFang SC",sans-serif;background:transparent;color:inherit;border:1px solid currentColor;border-radius:20px;padding:8px 16px;cursor:pointer;white-space:nowrap}button:hover{opacity:.7}button:focus-visible{outline:2px solid #279767;outline-offset:3px}:host([data-current]) button{font-weight:600}:host([data-floating]){position:fixed;right:20px;top:14px;color:#202a25;background:#f8faf8;border-radius:20px;box-shadow:0 1px 5px #0002}@media(max-width:767px){:host{display:none}}';
  const button = document.createElement("button");
  button.textContent = current ? "控制台" : "控制台 ↗";
  button.title = "Onchain OS Console · 非官方本机工具";
  if (current) {
    host.setAttribute("data-current", "");
    button.setAttribute("aria-current", "page");
  }
  button.addEventListener("click", () => {
    if (!current) location.assign(new URL(CONSOLE_PATH, location.origin));
  });
  shadow.append(style, button);

  const mount = () => {
    const header =
      document.querySelector("header") ??
      document.querySelector('[role="banner"]');
    const target = header?.querySelector("nav") ?? header;
    if (target) {
      host.removeAttribute("data-floating");
      if (host.parentElement !== target) target.append(host);
    } else if (!host.isConnected) {
      host.setAttribute("data-floating", "");
      document.body.append(host);
    }
  };

  mount();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      mount();
    });
  }).observe(document.body, { childList: true, subtree: true });
}

function installConsolePage() {
  const host = document.createElement("div");
  host.id = "onchain-console-page";
  host.style.cssText =
    "display:block!important;width:100%!important;min-height:560px!important;background:#000!important";
  const shadow = host.attachShadow({ mode: "closed" });
  const frame = document.createElement("iframe");
  frame.src = chrome.runtime.getURL("index.html");
  frame.title = "Onchain OS Console";
  frame.scrolling = "no";
  frame.style.cssText =
    "display:block;width:100%;height:100%;border:0;background:#000";
  shadow.append(frame);

  window.addEventListener("message", (event) => {
    if (
      event.source !== frame.contentWindow ||
      event.data?.source !== "onchain-console" ||
      event.data?.type !== "RESIZE"
    )
      return;
    const height = Number(event.data.height);
    if (Number.isFinite(height))
      host.style.height = `${Math.min(Math.max(height, 560), 100000)}px`;
  });

  const mount = () => {
    const container = document.querySelector(".okx-ai-404-container");
    if (container && host.parentElement !== container)
      container.replaceChildren(host);
  };
  mount();
  new MutationObserver(mount).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (isTargetUrl(location.href)) {
  const current = isConsoleUrl(location.href);
  installConsoleEntry(current);
  if (current) installConsolePage();
}
