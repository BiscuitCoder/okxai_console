// @vitest-environment jsdom
import { act } from "react";
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { createDemoSnapshot } from "../src/data";

it.each([
  [true, null],
  [true, "en"],
  [false, "en"],
] as const)(
  "设置中的语言偏好仅作用于独立 Web（localWeb=%s, saved=%s）",
  async (localWeb, saved) => {
    vi.resetModules();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    localStorage.removeItem("onchain-web-locale");
    if (saved) localStorage.setItem("onchain-web-locale", saved);
    document.documentElement.lang = "zh-CN";
    window.history.replaceState(null, "", "/?locale=zh-Hant");
    document.body.innerHTML = '<div id="root"></div>';
    vi.doMock("../src/client", () => ({
      localWeb,
      client: {
        snapshot: async () => createDemoSnapshot(),
        selected: async () => null,
        history: async () => [],
      },
    }));
    await act(async () => {
      await import("../src/main");
    });
    expect(document.querySelector(".language-picker")).toBeNull();
    await act(async () => {
      const buttons =
        document.querySelectorAll<HTMLButtonElement>("nav button");
      buttons[buttons.length - 1].click();
    });
    if (localWeb) {
      expect(document.querySelector("nav")?.textContent).toContain("Overview");
      expect(document.documentElement.lang).toBe("en");
      await act(async () => {
        document
          .querySelector<HTMLButtonElement>('[aria-label="Language"]')!
          .click();
      });
      await act(async () => {
        document
          .querySelector<HTMLButtonElement>(
            '[role="option"][data-value="zh-Hant"]',
          )!
          .click();
      });
      expect(document.querySelector("nav")?.textContent).toContain("總覽");
      expect(localStorage.getItem("onchain-web-locale")).toBe("zh-Hant");
      expect(document.documentElement.lang).toBe("zh-Hant");
    } else {
      expect(document.querySelector(".language-picker")).toBeNull();
      expect(document.querySelector("nav")?.textContent).toContain("總覽");
      expect(localStorage.getItem("onchain-web-locale")).toBe("en");
    }
    vi.doUnmock("../src/client");
    vi.resetModules();
    vi.unstubAllGlobals();
    document.documentElement.lang = "zh-CN";
    window.history.replaceState(null, "", "/");
  },
);

it("完整演练流程：取消不写入、确认保存、账户隔离、刷新持久化及八页渲染", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  await act(async () => {
    await import("../src/main");
  });
  const click = async (label: string) => {
    const button = [...document.querySelectorAll("button")].find(
      (b) =>
        b.textContent?.trim() === label ||
        b.getAttribute("aria-label") === label,
    );
    expect(button, label).toBeTruthy();
    await act(async () => {
      button!.click();
    });
  };
  const selectAccount = async (id: string) => {
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="切换账户"]')!
        .click();
    });
    const option = document.querySelector<HTMLButtonElement>(
      `[role="option"][data-value="${id}"]`,
    );
    expect(option, id).toBeTruthy();
    await act(async () => {
      option!.click();
    });
  };
  expect(document.querySelector("select")).toBeNull();
  expect(readFileSync("src/main.tsx", "utf8")).toContain(
    "root.getBoundingClientRect().height",
  );
  expect(document.body.textContent).toContain("$12.48");
  for (const label of [
    "身份与审核",
    "服务",
    "调用与任务",
    "钱包与流水",
    "争议与评价",
    "操作记录",
    "设置",
    "总览",
  ]) {
    const button = [...document.querySelectorAll("nav button")].find((b) =>
      b.textContent?.startsWith(label),
    )!;
    await act(async () => {
      (button as HTMLButtonElement).click();
    });
    expect(
      document.querySelector(`nav button[aria-current="page"]`)?.textContent,
    ).toContain(label);
  }
  await click("服务");
  await click("演练调价");
  expect(document.querySelector("dialog[open]")).toBeTruthy();
  await act(async () => {
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(document.body.textContent).toContain("确认演练");
  expect(localStorage.getItem("onchain-demo-v1")).toBeNull();
  await click("关闭演练");
  expect(localStorage.getItem("onchain-demo-v1")).toBeNull();
  await click("演练调价");
  await act(async () => {
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await click("确认演练");
  expect(document.querySelector("dialog[open]")?.textContent).toContain(
    "演练未执行",
  );
  expect(
    Object.keys(JSON.parse(localStorage.getItem("onchain-demo-v1")!)).filter(
      (k) => k.startsWith("receipt:"),
    ),
  ).toHaveLength(1);
  await click("查看操作记录");
  expect(document.querySelectorAll(".receipt-row")).toHaveLength(1);
  await selectAccount("demo-lab");
  expect(document.querySelectorAll(".receipt-row")).toHaveLength(0);
  await selectAccount("demo-radar");
  await click("刷新数据");
  expect(document.querySelectorAll(".receipt-row")).toHaveLength(1);
  vi.unstubAllGlobals();
});
