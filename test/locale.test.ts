import { describe, expect, it } from "vitest";
import { consoleLabel, detectLocale } from "../src/locale";

describe("OKX.AI 语言跟随", () => {
  it.each([
    ["zh-Hans", "/zh-hans", "zh-Hans"],
    ["zh-Hant", "/zh-hant", "zh-Hant"],
    ["zh-TW", "/", "zh-Hant"],
    ["en-US", "/en", "en"],
    ["", "/zh-hans", "zh-Hans"],
  ] as const)("将 %s / %s 识别为 %s", (language, path, expected) => {
    expect(detectLocale(language, path)).toBe(expected);
  });

  it("控制台入口在各语言中保留右上箭头", () => {
    expect(consoleLabel("zh-Hant")).toBe("控制台 ↗");
    expect(consoleLabel("en")).toBe("Console ↗");
  });
});
