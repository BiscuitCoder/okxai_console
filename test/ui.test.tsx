// @vitest-environment jsdom
import { act } from "react";
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";

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
