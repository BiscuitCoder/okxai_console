#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const hostName = "com.okx.onchain_console";
const scriptPath = fileURLToPath(import.meta.url);
const blockedKeys = new Set([
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secretkey",
  "passphrase",
  "sessionkey",
  "sessioncert",
  "teeid",
  "sateeid",
  "encryptedsessionsk",
  "signingkey",
  "rawtx",
  "unsignedtx",
  "privatekey",
  "mnemonic",
  "seedphrase",
]);

function cliPath() {
  const candidates = [
    process.env.ONCHAINOS_BIN,
    join(homedir(), ".local/bin/onchainos"),
    "/usr/local/bin/onchainos",
    "/opt/homebrew/bin/onchainos",
  ].filter(Boolean);
  const path = candidates.find(existsSync);
  if (!path) throw new Error("未找到 onchainos CLI");
  return path;
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !blockedKeys.has(key.toLowerCase().replace(/[^a-z0-9]/g, "")),
      )
      .map(([key, child]) => [key, sanitize(child)]),
  );
}

async function run(args) {
  const { stdout } = await exec(cliPath(), args, {
    encoding: "utf8",
    timeout: 20_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const result = sanitize(JSON.parse(stdout.trim()));
  if (!result.ok) throw new Error(result.error || "查询失败");
  return result.data;
}

function message(error) {
  const text = error instanceof Error ? error.message : String(error);
  if (/session expired|login again|not logged in/i.test(text))
    return "登录已过期，请在终端运行 onchainos wallet login";
  return text.replace(/^Command failed[^\n]*\n?/, "").trim() || "查询失败";
}

async function optional(label, args, warnings) {
  try {
    return await run(args);
  } catch (error) {
    warnings.push(`${label}：${message(error)}`);
    return null;
  }
}

const array = (value) => (Array.isArray(value) ? value : []);
const first = (value, keys) => {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) {
    const found = value[key];
    if (found !== undefined && found !== null && found !== "") return found;
  }
};
const text = (value, keys, fallback = "") =>
  String(first(value, keys) ?? fallback);
const number = (value, keys) => {
  const parsed = Number(first(value, keys));
  return Number.isFinite(parsed) ? parsed : 0;
};
const displayLabel = (value) => {
  const raw = String(value ?? "");
  const normalized = raw.trim().toLowerCase();
  return (
    {
      "not listed": "未上架",
      "review not submitted": "未上架",
      "listing under review": "上架审核中",
      success: "成功",
      pending: "处理中",
      failed: "失败",
    }[normalized] ?? raw
  );
};
const cell = (value, names) => {
  for (const item of array(value?.cells)) {
    const label = String(
      first(item, ["key", "label", "name"]) ?? "",
    ).toLowerCase();
    if (names.some((name) => label === name.toLowerCase()))
      return first(item, ["value", "text", "content"]);
  }
};
const field = (value, keys, labels = keys) =>
  first(value, keys) ?? cell(value, labels);
const balanceRows = (value) =>
  Object.values(value?.details ?? {}).flatMap((group) => array(group?.data));
const agentGroups = (value) => array(value?.list);
const taskRows = (value) => array(value?.tasks);
const subscriptionRows = (value) => array(value?.list);
const serviceRows = (value) =>
  array(value).flatMap((group) => array(group?.list));
const feedbackRows = (value) => array(value?.list);
const arbitrationRows = (value) => array(value?.payload?.items);
const refundRows = (value) => array(value?.items);
const historyRows = (value) =>
  array(value).flatMap((group) => array(group?.orderList));
const userTaskRows = (value) => array(value?.oneTimeTasks?.list);
const timestamp = (value) => {
  if (!value) return new Date().toISOString();
  const numeric = Number(value);
  if (Number.isFinite(numeric))
    return new Date(
      numeric < 10_000_000_000 ? numeric * 1000 : numeric,
    ).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
};
const role = (value) => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "1") return "User";
  if (normalized === "2") return "ASP";
  if (normalized === "3") return "Evaluator";
  if (normalized.includes("asp") || normalized.includes("provider"))
    return "ASP";
  if (normalized.includes("eval")) return "Evaluator";
  if (normalized.includes("user") || normalized.includes("buyer"))
    return "User";
  return "Unknown";
};

function agentsFrom(data) {
  return agentGroups(data).flatMap((group) =>
    array(first(group, ["agentList", "agents", "list"])).map((agent) => ({
      group,
      agent,
    })),
  );
}

function addressesFrom(data) {
  return [
    ["EVM", "evm"],
    ["X Layer", "xlayer"],
    ["Solana", "solana"],
    ["Bitcoin", "bitcoin"],
    ["Sui", "sui"],
  ].flatMap(([network, key]) => {
    const entry = array(data?.[key])[0];
    const address = text(entry, ["address"]);
    return address ? [{ network, address }] : [];
  });
}

function event(item, kind, accountId, fallbackRole = "Unknown") {
  const generatedId = createHash("sha256")
    .update(JSON.stringify(item))
    .digest("hex")
    .slice(0, 16);
  return {
    id: text(item, ["jobId", "taskId", "id", "txHash", "orderId"], generatedId),
    accountId: text(item, ["accountId"], accountId),
    kind,
    role: role(first(item, ["myRole", "role"]) ?? fallbackRole),
    title: text(
      item,
      ["title", "serviceName", "name", "coinSymbol"],
      "未命名记录",
    ),
    status: displayLabel(
      text(item, ["statusLabel", "txStatus", "approvalStatus"], "未提供"),
    ),
    createdAt: timestamp(
      first(item, ["createdAt", "createTime", "txTime", "subStartTime"]),
    ),
    amount:
      text(item, [
        "tokenAmount",
        "serviceTokenAmount",
        "amount",
        "coinAmount",
        "refundAmount",
      ]) || undefined,
    detail: text(
      item,
      ["statusDescription", "description", "detail", "failReason"],
      "未提供",
    ),
    reference: text(item, ["jobId", "txHash", "orderId"]) || undefined,
  };
}

async function a2mcpInvocations(accountId) {
  const directory = join(
    process.env.ONCHAINOS_HOME || join(homedir(), ".onchainos"),
    "payments",
  );
  if (!existsSync(directory)) return [];
  const files = (await readdir(directory)).filter((name) =>
    /^pay_[a-zA-Z0-9_-]+\.json$/.test(name),
  );
  const records = await Promise.all(
    files.map(async (name) => {
      try {
        const record = JSON.parse(
          await readFile(join(directory, name), "utf8"),
        );
        if (
          record?.source !== "okx_ai_a2mcp" ||
          record?.ownerAccountId !== accountId
        )
          return null;
        const accept = record.selectedAccept ?? {};
        const request = record.frozenRequest ?? {};
        const resource = request.resource ?? {};
        const decimals = Number(accept.decimals);
        const rawAmount = Number(accept.amount);
        const amount =
          Number.isFinite(decimals) && Number.isFinite(rawAmount)
            ? String(rawAmount / 10 ** decimals)
            : undefined;
        const state = String(record.execution?.state ?? "");
        const status =
          state === "success"
            ? "调用完成"
            : state === "failed"
              ? "调用失败"
              : Number(record.expiresAt) < Date.now() / 1000
                ? "已过期"
                : "待支付";
        const params = Object.entries(request.typedParams ?? {})
          .filter(
            ([key]) =>
              !blockedKeys.has(key.toLowerCase().replace(/[^a-z0-9]/g, "")),
          )
          .map(([key, value]) => `${key}=${String(value).slice(0, 160)}`)
          .join("，");
        return {
          id: String(record.paymentId ?? name.replace(/\.json$/, "")),
          accountId,
          kind: "invocation",
          role: "User",
          title: String(resource.description || "A2MCP 服务调用"),
          status,
          createdAt: timestamp(record.createdAt),
          ...(amount ? { amount } : {}),
          detail: [
            request.method ? `请求方式：${request.method}` : "",
            params ? `调用参数：${params}` : "",
            accept.symbol ? `支付资产：${accept.symbol}` : "",
            state === "success" ? "结算状态：本机记录未保存链上凭证" : "",
          ]
            .filter(Boolean)
            .join("；"),
        };
      } catch {
        return null;
      }
    }),
  );
  return records.filter(Boolean);
}

export async function snapshot() {
  const warnings = [];
  const status =
    (await optional("钱包状态", ["wallet", "status"], warnings)) ?? {};
  const fallbackId = text(status, ["currentAccountId"], "active");
  const fallbackName = text(status, ["currentAccountName"], "当前账户");
  const fallbackAccount = {
    id: fallbackId,
    name: fallbackName,
    address: "",
    description: text(status, ["email", "loginType"], "OnchainOS"),
  };

  if (status.loggedIn !== true) {
    if (!warnings.some((item) => item.includes("登录")))
      warnings.push("登录已过期，请在终端运行 onchainos wallet login");
    return {
      mode: "live",
      capturedAt: new Date().toISOString(),
      warnings,
      accounts: [fallbackAccount],
      wallets: [
        {
          accountId: fallbackId,
          address: "",
          chain: "全部网络",
          totalUsd: 0,
          assets: [],
        },
      ],
      identities: [],
      services: [],
      events: [],
    };
  }

  const [
    balances,
    addressData,
    agentData,
    taskData,
    userTaskData,
    buyerSubs,
    providerSubs,
    history,
    invocationData,
  ] = await Promise.all([
    optional("钱包资产", ["wallet", "balance", "--all"], warnings),
    optional("钱包地址", ["wallet", "addresses"], warnings),
    optional(
      "Agent 身份",
      ["agent", "get-my-agents", "--page-size", "50"],
      warnings,
    ),
    optional("任务", ["agent", "active-tasks", "--include-terminal"], warnings),
    optional(
      "用户任务历史",
      [
        "agent",
        "my-tasks",
        "--task-type",
        "one-time",
        "--status-type",
        "0",
        "--page",
        "1",
        "--page-size",
        "50",
      ],
      warnings,
    ),
    optional(
      "买方订阅",
      ["agent", "my-subscriptions", "--role", "buyer"],
      warnings,
    ),
    optional(
      "服务方订阅",
      ["agent", "my-subscriptions", "--role", "provider"],
      warnings,
    ),
    optional("钱包流水", ["wallet", "history", "--limit", "50"], warnings),
    a2mcpInvocations(fallbackId).catch((error) => {
      warnings.push(`A2MCP 调用记录：${message(error)}`);
      return null;
    }),
  ]);

  const currentAddresses = addressesFrom(addressData);
  const primaryAddress =
    currentAddresses.find((item) => item.network === "EVM")?.address ??
    currentAddresses[0]?.address ??
    "";

  const balanceAccounts = balanceRows(balances);
  const accounts = balanceAccounts.map((item, index) => {
    const id = text(item, ["accountId"], fallbackId);
    return {
      id,
      name: id === fallbackId ? fallbackName : `账户 ${index + 1}`,
      address: id === fallbackId ? primaryAddress : "",
      description:
        id === fallbackId ? fallbackAccount.description : "OnchainOS",
    };
  });
  if (!accounts.length)
    accounts.push({ ...fallbackAccount, address: primaryAddress });

  const wallets = accounts.map((account) => {
    const item =
      balanceAccounts.find(
        (candidate) => text(candidate, ["accountId"]) === account.id,
      ) ?? {};
    const assets = array(item.tokenAssets).map((asset) => ({
      symbol: text(asset, ["symbol", "tokenName"], "未知资产"),
      balance: text(asset, ["balance"], "0"),
      usd: number(asset, ["usdValue"]),
      chain:
        text(asset, ["chainName", "chainSymbol", "chainIndex"]) || undefined,
    }));
    return {
      accountId: account.id,
      address: account.address,
      chain: "全部网络",
      totalUsd:
        accounts.length === 1
          ? number(balances, ["totalValueUsd"])
          : assets.reduce((sum, asset) => sum + asset.usd, 0),
      addresses: account.id === fallbackId ? currentAddresses : [],
      assets,
    };
  });

  const ownedAgents = agentsFrom(agentData);
  const identities = ownedAgents
    .map(({ group, agent }) => {
      const agentRole = role(
        field(agent, ["roleLabel", "role", "identity"], ["role"]),
      );
      const id = String(field(agent, ["agentId", "id"], ["agent id"]) ?? "");
      if (!/^\d+$/.test(id)) return null;
      return {
        id,
        accountId: text(group, ["accountId"], fallbackId),
        name: String(
          field(agent, ["name", "agentName"], ["name"]) ?? `Agent ${id}`,
        ),
        role: agentRole,
        status:
          agentRole === "ASP"
            ? displayLabel(
                field(agent, ["statusLabel"], ["status"]) ?? "未提供",
              )
            : "—",
        review:
          agentRole === "ASP"
            ? displayLabel(
                field(
                  agent,
                  ["approvalLabel", "approvalStatusLabel"],
                  ["approval status"],
                ) ?? "未提供",
              )
            : "—",
        rejection: text(agent, ["rejectionReason"]) || undefined,
        online:
          first(agent, ["online", "isOnline"]) === true ||
          Number(first(agent, ["onlineStatus"])) === 1,
        address: text(
          agent,
          ["agentWalletAddress", "address", "ownerAddress"],
          text(group, ["ownerAddress"]),
        ),
        rating: Number.isFinite(Number(cell(agent, ["rating"])))
          ? Number(cell(agent, ["rating"]))
          : null,
        picture:
          text(agent, ["profilePicture", "picture", "avatar", "icon"]) ||
          undefined,
        serviceIds: [],
      };
    })
    .filter(Boolean);

  const serviceResults = await Promise.all(
    identities
      .filter((identity) => identity.role === "ASP")
      .map(async (identity) => ({
        identity,
        data: await optional(
          `${identity.name} 服务`,
          [
            "agent",
            "service-list",
            "--agent-id",
            identity.id,
            "--page",
            "1",
            "--page-size",
            "50",
          ],
          warnings,
        ),
      })),
  );
  const services = serviceResults.flatMap(({ identity, data }) => {
    const agentPicture =
      identity.picture ||
      array(data)
        .map((group) =>
          text(group?.agentInfo, ["profilePicture", "picture", "avatar"]),
        )
        .find(Boolean);
    return serviceRows(data).map((item, index) => {
      const id = text(
        item,
        ["serviceId", "id", "sid"],
        `${identity.id}-${index}`,
      );
      identity.serviceIds.push(id);
      const rawType = String(
        field(item, ["serviceType", "type"], ["type"]) ?? "",
      );
      return {
        id,
        accountId: identity.accountId,
        identityId: identity.id,
        name: String(
          field(item, ["serviceName", "name"], ["name"]) ?? "未命名服务",
        ),
        type: rawType === "A2A" || rawType === "A2MCP" ? rawType : "未知",
        price: String(field(item, ["fee", "price"], ["fee"]) ?? "0"),
        endpoint: String(field(item, ["endpoint"], ["endpoint"]) ?? "未提供"),
        description: text(item, ["serviceDescription", "description"]),
        icon:
          text(item, ["servicePicture", "serviceIcon", "icon", "picture"]) ||
          agentPicture ||
          undefined,
        volume: number(item, ["salesCount", "soldCount"]),
        review: identity.review,
      };
    });
  });

  const activityResults = await Promise.all(
    identities.map(async (identity) => {
      const common = ["--agent-id", identity.id];
      const feedback = await optional(
        `${identity.name} 评价`,
        [
          "agent",
          "feedback-list",
          ...common,
          "--page",
          "1",
          "--page-size",
          "50",
        ],
        warnings,
      );
      const arbitration =
        identity.role === "User" || identity.role === "ASP"
          ? await optional(
              `${identity.name} 争议`,
              [
                "agent",
                "arbitration-list",
                ...common,
                "--page",
                "1",
                "--page-size",
                "50",
              ],
              warnings,
            )
          : null;
      const refunds =
        identity.role === "User" || identity.role === "ASP"
          ? await optional(
              `${identity.name} 退款`,
              [
                "agent",
                "refund-list",
                "--role",
                identity.role === "ASP" ? "provider" : "buyer",
                "--scope",
                "requested",
                ...common,
                "--page-size",
                "50",
              ],
              warnings,
            )
          : null;
      return { identity, feedback, arbitration, refunds };
    }),
  );

  const tasks = taskRows(taskData);
  const userTasks = userTaskRows(userTaskData);
  const invocations = invocationData ?? [];
  const buyerSubscriptions = subscriptionRows(buyerSubs);
  const providerSubscriptions = subscriptionRows(providerSubs);
  const transactions = historyRows(history);
  const feedbacks = activityResults.flatMap(({ identity, feedback }) =>
    feedbackRows(feedback).map((item) => ({ identity, item })),
  );
  const arbitrations = activityResults.flatMap(({ identity, arbitration }) =>
    arbitrationRows(arbitration).map((item) => ({ identity, item })),
  );
  const refunds = activityResults.flatMap(({ identity, refunds }) =>
    refundRows(refunds).map((item) => ({ identity, item })),
  );
  const events = [
    ...invocations,
    ...tasks.map((item) =>
      event(
        item,
        first(item, ["jobType", "taskType"]) === 1 ? "subscription" : "task",
        fallbackId,
      ),
    ),
    ...userTasks.map((item) => event(item, "task", fallbackId, "User")),
    ...buyerSubscriptions.map((item) =>
      event(item, "subscription", fallbackId, "User"),
    ),
    ...providerSubscriptions.map((item) =>
      event(item, "subscription", fallbackId, "ASP"),
    ),
    ...transactions.map((item) => {
      const direction = first(item, ["direction"]);
      const prefix =
        direction === "IN" ? "转入" : direction === "OUT" ? "转出" : "流水";
      return event(
        { ...item, title: `${prefix} ${text(item, ["coinSymbol"], "资产")}` },
        "transaction",
        fallbackId,
        "User",
      );
    }),
    ...feedbacks.map(({ identity, item }) =>
      event(item, "feedback", identity.accountId, identity.role),
    ),
    ...arbitrations.map(({ identity, item }) =>
      event(item, "arbitration", identity.accountId, identity.role),
    ),
    ...refunds.map(({ identity, item }) =>
      event(item, "arbitration", identity.accountId, identity.role),
    ),
  ];
  const uniqueEvents = [
    ...new Map(
      events.map((item) => [`${item.kind}:${item.id}`, item]),
    ).values(),
  ];
  const source = (key, label, data, count, detail) => ({
    key,
    label,
    state: data === null ? "error" : count ? "available" : "empty",
    count,
    ...(detail ? { detail } : {}),
  });
  const sources = [
    source(
      "wallet-addresses",
      "钱包地址",
      addressData,
      currentAddresses.length,
    ),
    source(
      "wallet-assets",
      "钱包资产",
      balances,
      wallets.reduce((sum, wallet) => sum + wallet.assets.length, 0),
    ),
    source("wallet-history", "钱包流水", history, transactions.length),
    source("identities", "Agent 身份", agentData, identities.length),
    source(
      "services",
      "ASP 服务",
      serviceResults.some(({ data }) => data === null) ? null : true,
      services.length,
    ),
    source("tasks", "任务", taskData, tasks.length),
    source("user-tasks", "用户任务历史", userTaskData, userTasks.length),
    source(
      "a2mcp-invocations",
      "A2MCP 调用记录",
      invocationData,
      invocations.length,
      "来自 OnchainOS 本机付款记录",
    ),
    source(
      "buyer-subscriptions",
      "买方订阅",
      buyerSubs,
      buyerSubscriptions.length,
    ),
    source(
      "provider-subscriptions",
      "服务方订阅",
      providerSubs,
      providerSubscriptions.length,
    ),
    source(
      "feedback",
      "评价",
      activityResults.some(({ feedback }) => feedback === null) ? null : true,
      feedbacks.length,
    ),
    source(
      "arbitration",
      "争议",
      activityResults
        .filter(({ identity }) => ["User", "ASP"].includes(identity.role))
        .some(({ arbitration }) => arbitration === null)
        ? null
        : true,
      arbitrations.length,
    ),
    source(
      "refunds",
      "退款",
      activityResults
        .filter(({ identity }) => ["User", "ASP"].includes(identity.role))
        .some(({ refunds }) => refunds === null)
        ? null
        : true,
      refunds.length,
    ),
    {
      key: "claimable",
      label: "待领取奖励",
      state: "unsupported",
      detail: "CLI 4.6.0 当前仅返回文本，暂不展示",
    },
  ];

  return {
    mode: "live",
    capturedAt: new Date().toISOString(),
    warnings: [...new Set(warnings)],
    accounts,
    identities,
    services,
    wallets,
    events: uniqueEvents,
    sources,
  };
}

function extensionId(key) {
  const digest = createHash("sha256")
    .update(Buffer.from(key, "base64"))
    .digest("hex")
    .slice(0, 32);
  return [...digest]
    .map((value) => "abcdefghijklmnop"[parseInt(value, 16)])
    .join("");
}

const shellQuote = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;

async function install() {
  const manifest = JSON.parse(
    await readFile(join(dirname(scriptPath), "public/manifest.json"), "utf8"),
  );
  const id = extensionId(manifest.key);
  const hostDirectory = join(
    homedir(),
    "Library/Application Support/Google/Chrome/NativeMessagingHosts",
  );
  const target = join(hostDirectory, `${hostName}.json`);
  const launcher = join(hostDirectory, `${hostName}.sh`);
  await mkdir(dirname(target), { recursive: true });
  await chmod(scriptPath, 0o755);
  await writeFile(
    launcher,
    `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(scriptPath)}\n`,
    { mode: 0o755 },
  );
  await chmod(launcher, 0o755);
  await writeFile(
    target,
    `${JSON.stringify({ name: hostName, description: "Onchain OS Console read-only data bridge", path: launcher, type: "stdio", allowed_origins: [`chrome-extension://${id}/`] }, null, 2)}\n`,
    { mode: 0o644 },
  );
  console.log(
    JSON.stringify({
      ok: true,
      host: hostName,
      extensionId: id,
      manifest: target,
      launcher,
    }),
  );
}

function send(value) {
  const body = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  process.stdout.write(Buffer.concat([header, body]));
}

async function main() {
  if (process.argv.includes("--install")) return install();
  if (process.argv.includes("--snapshot")) {
    console.log(JSON.stringify({ ok: true, data: await snapshot() }, null, 2));
    return;
  }
  let input = Buffer.alloc(0);
  process.stdin.on("data", async (chunk) => {
    input = Buffer.concat([input, chunk]);
    while (input.length >= 4) {
      const size = input.readUInt32LE(0);
      if (input.length < size + 4) return;
      const request = JSON.parse(input.subarray(4, size + 4).toString("utf8"));
      input = input.subarray(size + 4);
      try {
        if (request?.version !== 1 || request?.method !== "snapshot")
          throw new Error("不支持的请求");
        send({
          version: 1,
          requestId: request.requestId,
          ok: true,
          data: await snapshot(),
        });
      } catch (error) {
        send({
          version: 1,
          requestId: request?.requestId,
          ok: false,
          error: message(error),
        });
      }
    }
  });
}

if (process.argv[1] && realpathSync(process.argv[1]) === scriptPath)
  main().catch((error) => {
    if (process.argv.some((arg) => arg.startsWith("--"))) {
      console.error(JSON.stringify({ ok: false, error: message(error) }));
      process.exitCode = 1;
    } else {
      send({ version: 1, ok: false, error: message(error) });
    }
  });
