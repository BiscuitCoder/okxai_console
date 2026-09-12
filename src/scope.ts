export const CONSOLE_PATH = "/_onchain-os-console";

export function isTargetUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      ["okx.ai", "www.okx.ai"].includes(u.hostname) &&
      !u.port
    );
  } catch {
    return false;
  }
}

export function isConsoleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      isTargetUrl(value) &&
      (url.pathname === CONSOLE_PATH || url.pathname === `${CONSOLE_PATH}/`)
    );
  } catch {
    return false;
  }
}
