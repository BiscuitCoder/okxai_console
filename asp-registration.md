# Onchain OS Console：A2A ASP 注册资料

状态：2026-09-13 已创建 ASP 身份及服务，并已提交 OKX.AI 上架审核；当前等待审核，尚未进行实际订单交付测试。

- Agent ID：`13628`
- Service ID：`b2861504-1b1c-433b-bec4-ce0d57589be8`
- 上架审核：已提交，审核语言为 `zh-CN`，等待平台审核结果。
- 通信检查：自动修复命令被环境安全审核拦截，未执行。随后调用 `okx-a2a doctor --help`，当前 CLI 实际执行了诊断及身份刷新，报告 8 项通过、0 警告、0 失败；Codex 提供商已绑定，守护进程运行，3 个 Agent 客户端活跃。未执行运行时升级或重启。

## ASP 身份

- 名称：Onchain OS Console
- 简介：为 OnchainOS 用户提供本机只读控制台，集中查看账户、Agent、服务、任务及资产信息。
- 头像原图：`public/product-icon.png`
- 已上传头像：https://static.okx.com/cdn/web3/wallet/marketplace/headimages/agent/avatar/d5edcfd6-f6be-45e5-bf27-45487ddb5ccb.png

## 服务定位

仅注册一项服务：OKX.AI 账户可视化控制台。不注册此前拟定的免费启动指导服务。
价格为 0.5 USDT / 次，通过 OKX.AI 平台支付，不设置月订阅。
交付物为 npx 启动的本机账户可视化控制台及使用说明，不是故障排查报告。
工具内部不集成支付或付费校验；公开 npm 包仍可直接运行。
保留独立 Web 与浏览器插件模式，不新增公网 A2MCP 接口。
npx 启动的是用户本机 Web 服务，不是 ASP 的 A2A 接单运行时；注册后仍需完成 Agent 通信配置。

## 注册服务参数

以下为已通过本地 `agent validate-listing` 校验的唯一服务参数：

```json
[
  {
    "serviceName": "OKX.AI 账户可视化控制台",
    "serviceType": "A2A",
    "fee": "0.5",
    "subscription": [],
    "serviceDescription": "面向 OKX.AI 与 OnchainOS 用户，补充个人账户的可视化管理页面，将分散在命令行中的信息集中呈现为只读控制台。支持查看账户与钱包地址、Agent 身份及审核情况、ASP 服务、调用与任务、订阅、资产与流水、争议及评价，并提供筛选、详情查看和数据来源状态提示。支持通过 npx 在用户本机启动独立 Web 页面，也可通过浏览器插件嵌入 OKX.AI。不托管私钥，不代签名或执行资金操作。",
    "serviceGuide": "交付物：可在用户本机运行的账户可视化控制台，以及启动和使用说明。不以故障排查报告作为交付物，也不提供远程托管的账户页面。\n1. 准备环境：用户电脑需安装 Node.js 22.14+ 和 OnchainOS CLI，由用户自行完成 onchainos wallet login 登录授权。\n2. 启动控制台：npx --yes okx-onchain-console@latest。命令下载并启动控制台，自动在默认浏览器打开本机 Web 页面。必须在用户自己的电脑上运行，才能读取其本机 OnchainOS 数据。\n3. 可选参数：--port 43127 固定端口；--no-open 禁止自动打开浏览器。浏览器未自动打开时，使用终端输出的完整地址；按 Ctrl+C 停止服务。\n4. 语言与插件：独立 Web 默认英文，可在设置中切换语言。浏览器插件需按项目 README 单独安装，嵌入 OKX.AI 并跟随主站语言。\n5. 数据说明：展示范围取决于用户登录状态与 CLI 可用数据；页面区分空数据、查询失败及暂不支持的数据。\n6. 安全边界：仅提供只读查询，不索取私钥、助记词、验证码或本地访问凭证，不代签名、付款或交易。安装软件、登录授权及修改本机配置须由用户确认。"
  }
]
```

## 发布步骤

1. 用户最终确认后创建 ASP 身份及上述服务。
2. 完成 Agent 通信配置和就绪检查。
3. 提交 OKX.AI 上架审核；注册成功不等于审核通过。
4. 成功后在本文件记录平台返回的 Agent ID、Service ID 与审核结果，不使用占位 ID。
