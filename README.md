<p align="center">
  <img src="public/icon.png" width="128" alt="Onchain OS Console icon" />
</p>

<h1 align="center">Onchain OS Console</h1>

<p align="center">把本机 OnchainOS CLI 数据带到 OKX.AI 的只读个人控制台。<br />A local, read-only personal console for OnchainOS data inside OKX.AI.</p>

> 非 OKX 官方产品。此项目不会读取钱包私钥，也不会发起签名、付款或链上交易。
>
> This is not an official OKX product. It does not read wallet private keys or initiate signatures, payments, or onchain transactions.

## 中文

### 功能

- 在 OKX.AI 顶栏增加「控制台」入口，并在 `/_onchain-os-console` 替换 404 内容区；原生 header 与 footer 保持不变。
- 通过 Chrome Native Messaging 连接常驻的本机 Node Companion，再调用 OnchainOS CLI 获取真实数据；扩展页面本身不运行 Node。
- 汇总本机账户、Agent 身份与审核、ASP 服务、调用与任务、订阅、钱包地址、资产、流水、争议与评价。
- 设置页明确区分“有数据”“当前为空”“查询失败”和“暂无结构化数据”，不把空结果伪装成故障或业务状态。
- 自适应深色界面、自定义下拉选择、可点击遮罩关闭且带过渡动画的详情抽屉。

### 环境要求

- Node.js 22.14+
- Chrome 116+ 桌面版
- 已安装并可运行 OnchainOS CLI

### 安装

```sh
git clone https://github.com/BiscuitCoder/okxai_console.git
cd okxai_console
npm ci
npm test
npm run build
npm run companion:install
```

确认 `onchainos wallet status` 显示已登录；若登录过期，请运行 `onchainos wallet login`。随后打开 `chrome://extensions`，开启开发者模式，选择“加载已解压的扩展程序”，加载项目中的 `dist` 目录。

访问或刷新 [OKX.AI](https://www.okx.ai/zh-hans)，从顶栏进入「控制台」。未安装扩展时，`https://www.okx.ai/_onchain-os-console` 仍是正常的 404 页面。

开发界面时可运行：

```sh
npm run dev
```

浏览器预览使用隔离的模拟数据，不代表 Native Messaging 已连接。需要验证真实数据时，请加载构建后的扩展。

### 数据与安全边界

扩展仅申请 `storage`、`nativeMessaging` 和两个 OKX.AI HTTPS 域名权限，不申请 cookies、webRequest 或 sidePanel 权限。Companion 仅接受快照查询，使用参数数组执行只读 CLI 命令，并限制执行时间与输出大小。

数据会在返回扩展前移除访问令牌、刷新令牌、API Key、Session、TEE、签名与原始交易等敏感字段。账户选择仅保存在 `chrome.storage.local`，不进行云同步。当前列表查询最多读取第一页 50 条；CLI 只提供可读文本而没有稳定结构化输出的数据不会猜测解析。

更多连接机制与命令范围见 [COMPANION.md](./COMPANION.md)。

---

## English

### Features

- Adds a Console entry to the OKX.AI header and replaces only the 404 content at `/_onchain-os-console`, preserving the native header and footer.
- Uses Chrome Native Messaging to connect to a persistent local Node companion, which calls the OnchainOS CLI for live data. Node does not run inside the extension page.
- Brings together local accounts, Agent identities and reviews, ASP services, invocations and tasks, subscriptions, wallet addresses, balances, transactions, disputes, and feedback.
- Clearly distinguishes available, empty, failed, and unstructured data instead of inventing values or treating an empty result as an error.
- Includes a responsive dark UI, a custom select control, and an animated detail drawer that closes when its backdrop is clicked.

### Requirements

- Node.js 22.14+
- Chrome 116+ for desktop
- A working OnchainOS CLI installation

### Installation

```sh
git clone https://github.com/BiscuitCoder/okxai_console.git
cd okxai_console
npm ci
npm test
npm run build
npm run companion:install
```

Verify that `onchainos wallet status` reports an active login. If it has expired, run `onchainos wallet login`. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this project's `dist` directory.

Open or refresh [OKX.AI](https://www.okx.ai/), then use the Console item in the header. Without the extension, `https://www.okx.ai/_onchain-os-console` remains a normal 404 page.

For UI development:

```sh
npm run dev
```

The browser preview uses isolated mock data and does not validate Native Messaging. Load the built extension to verify live local data.

### Data and security boundaries

The extension requests only `storage`, `nativeMessaging`, and the two OKX.AI HTTPS host permissions. It does not request cookies, webRequest, or sidePanel access. The companion accepts snapshot queries only, executes read-only CLI commands with argument arrays, and enforces time and output limits.

Sensitive fields—including access and refresh tokens, API keys, sessions, TEE data, signatures, and raw transactions—are removed before data reaches the extension. Account selection stays in `chrome.storage.local` and is not synced. List queries currently read the first page, up to 50 records; data without stable structured CLI output is not guessed or scraped.

See [COMPANION.md](./COMPANION.md) for the connection model and command scope.
