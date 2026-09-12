import { describe, expect, it } from "vitest";
import { consoleLabel, detectLocale, translate } from "../src/locale";

describe("OKX.AI 语言跟随", () => {
  it.each([
    ["zh-Hans", "/zh-hans", "", "zh-Hans"],
    ["zh-Hant", "/zh-hant", "", "zh-Hant"],
    ["zh-TW", "/", "", "zh-Hant"],
    ["en-US", "/en", "", "en"],
    ["", "/zh-hans", "", "zh-Hans"],
    ["zh-Hans", "/", "locale=en", "en"],
    ["en", "/", "locale=zh_CN", "zh-Hans"],
    ["en", "/", "locale=zh_TW", "zh-Hant"],
  ] as const)(
    "将 %s / %s / %s 识别为 %s",
    (language, path, cookie, expected) => {
      expect(detectLocale(language, path, cookie)).toBe(expected);
    },
  );

  it("控制台入口在各语言中保留右上箭头", () => {
    expect(consoleLabel("zh-Hant")).toBe("控制台 ↗");
    expect(consoleLabel("en")).toBe("Console ↗");
  });

  it("翻译本机数据返回的审核、网络和交易方向标签", () => {
    expect(translate("en", "上架审核中")).toBe("Listing under review");
    expect(translate("en", "全部网络")).toBe("All networks");
    expect(translate("en", "转入")).toBe("Transfer in");
    expect(translate("zh-Hant", "数据可用性")).toBe("資料可用性");
  });
});
