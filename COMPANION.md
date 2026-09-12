# 本机只读数据桥接

## 边界

实际扩展的数据链路为：UI → 扩展后台 → Native Messaging → `companion.mjs` → OnchainOS CLI → OKX 服务。开发预览仍使用 `MockOnchainDataSource`，两种模式不会混合或自动回退。

真实模式只读。网页内容脚本不能调用 Companion；后台验证发送者必须是专用 OKX.AI 路由中的扩展 iframe。Companion 只接受 `snapshot`，不存在任意命令入口，也不提供平台写入、签名、付款、领取或登录操作。

## 只读映射

| 领域             | 已接入 CLI 能力                                     |
| ---------------- | --------------------------------------------------- |
| 账户与钱包       | wallet status / addresses / balance --all / history |
| 身份、审核、服务 | agent get-my-agents / service-list / feedback-list  |
| 调用与任务       | 本机 payments 记录 / active-tasks / my-tasks        |
| 奖励             | asp-claimable / arbitration-claimable               |
| 订阅             | my-subscriptions --role buyer / provider            |
| 争议、退款       | arbitration-list / refund-list                      |

命令已按本机 OnchainOS CLI 4.6.0 核实。单个列表最多读取 50 条，未知角色使用 `Unknown`，未知服务类型和缺失字段显示「未提供」，不推断审核、账单、退款或争议结果。

余额按 `details → data → tokenAssets` 读取，流水按批次内的 `orderList` 读取，服务按账户分组内的 `list` 读取；这些层级均来自 CLI 4.6.0 的实际响应，不再使用通用数组猜测。角色优先采用 `roleLabel`，并兼容 CLI 的 `1 User / 2 ASP / 3 Evaluator` 数值协议。

快照附带每个来源的可用性：成功且有记录、成功但当前为空、查询失败或暂无结构化数据。`asp-claimable` 与 `arbitration-claimable` 当前仅输出人类可读文本，因此真实模式不解析、不展示奖励金额。

A2MCP 不会创建 A2A 任务，CLI 4.6.0 也没有调用历史列表命令。Companion 只读解析 `~/.onchainos/payments/pay_*.json` 中由 CLI 保存的 A2MCP 执行状态，按当前账户过滤，仅输出服务说明、请求方式、调用参数、请求金额、时间和执行状态；付款地址、原始协议内容、签名及响应正文不会进入快照。CLI 文件中的执行成功不等同于链上结算成功；本地记录没有付款回执时，界面明确显示结算未确认。

## Native Messaging 协议

扩展后台使用 `connectNative` 保持 Port，在同一个 Companion 进程内重复请求；Port 断开时拒绝未完成请求，下次刷新自动重连。请求 `{ version: 1, requestId, method: "snapshot" }`；响应 `{ version: 1, requestId, ok, data?, error? }`。

使用 `npm run companion:install` 注册 `com.okx.onchain_console`，并生成使用 Node 绝对路径的固定启动器，避免 Chrome 的精简环境找不到 Node。宿主只允许 manifest 固定公钥对应的扩展 ID。CLI 通过 `execFile` 参数数组调用，无 shell 拼接；每条命令限制 20 秒与 2 MB 输出。未登录、命令缺失、网络故障与权限不足作为 warnings 返回，禁止静默切换模拟数据。

敏感字段按精确键名递归移除，包括 access/refresh token、API key/secret、passphrase、Session/TEE/签名材料、私钥、助记词和原始交易。Companion 不直接读取 OnchainOS 凭证文件。真实写入另行设计，不复用当前只读协议。
