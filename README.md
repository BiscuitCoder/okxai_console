<p align="center">
  <img src="https://raw.githubusercontent.com/BiscuitCoder/okxai_console/master/public/product-icon.png" width="160" alt="Onchain OS Console product icon" />
</p>

<h1 align="center">Onchain OS Console</h1>

<p align="center">本机 OnchainOS 只读个人控制台，可独立打开，也可通过浏览器插件嵌入 OKX.AI。<br />A local, read-only OnchainOS console: standalone in your browser or embedded in OKX.AI with a Chrome extension.</p>

## Preview / 预览

![Onchain OS Console overview](https://raw.githubusercontent.com/BiscuitCoder/okxai_console/master/public/screenshots/console-overview.png)

> This project does not read wallet private keys or initiate signatures, payments, or onchain transactions.

## 中文

### 两种使用方式

两种方式共用控制台界面和本机只读查询，按自己的使用习惯选择即可。

| 方式         | 在哪里使用                                   | 适合谁                                         |
| ------------ | -------------------------------------------- | ---------------------------------------------- |
| 独立 Web 版  | 独立浏览器标签页，访问本机地址               | 希望一条命令打开控制台、不安装浏览器插件的用户 |
| 浏览器插件版 | 在 OKX.AI 顶栏进入「控制台」，直接在站内渲染 | 希望在浏览 OKX.AI 时查看个人数据的用户         |

两种方式都需要 **Node.js 22.14+** 和已安装的 **OnchainOS CLI**。首次使用先在本机完成登录：

```sh
onchainos wallet login
```

#### 方式一：独立 Web 版（推荐）

无需下载项目源码或安装浏览器插件，直接运行：

```sh
npx --yes okx-onchain-console@latest
```

命令会下载并启动本地服务，自动在默认浏览器打开控制台。界面运行在 `http://127.0.0.1:端口`，不需要打开 OKX.AI 网站。若浏览器没有自动打开，请手动打开终端输出的完整地址。在终端按 **Ctrl+C** 停止服务；仅关闭标签页不会停止服务。

也可以指定端口或禁止自动打开浏览器：

```sh
npx --yes okx-onchain-console@latest --port 43127 --no-open
```

此命令不会自动安装 OnchainOS CLI 或替你完成登录授权。

独立 Web 版默认使用 English，可在「Settings / 设置 → Language / 语言」中手动选择简体中文、繁體中文或 English，切换后立即生效。选择保存在当前浏览器的本机地址下，后续优先使用已保存的语言；如需重启后沿用设置，建议使用 `--port 43127` 固定端口。插件版不显示此入口，继续跟随 OKX.AI 主站语言。

#### 方式二：浏览器插件版，嵌入 OKX.AI

扩展会在 OKX.AI 顶栏加入「控制台」入口，将控制台渲染到站内页面，保留网站原有的 header、footer 和滚动体验。当前使用 **Chrome 116+ 桌面版**，以下快捷启动和 Companion 安装流程适用于 **macOS**：

```sh
git clone https://github.com/BiscuitCoder/okxai_console.git
cd okxai_console
npm ci
npm run start:extension
```

该命令会构建扩展、注册本机 Companion，并打开 Chrome 扩展管理页和 OKX.AI 控制台。首次使用还需：

1. 在 `chrome://extensions` 开启「开发者模式」。
2. 点击「加载已解压的扩展程序」，选择项目中的 `dist` 目录。
3. 刷新 [OKX.AI](https://www.okx.ai/zh-hans)，点击顶栏「控制台」。

插件安装后，Chrome 会按需启动本机 Companion，无需额外运行 Web 服务。重新构建后，请在扩展管理页点击刷新。未安装插件时，`/_onchain-os-console` 地址仍会显示网站原有的 404 页面。

### 常用命令

| 命令                      | 用途                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `npm run start:web`       | 构建 Web 版、启动本地服务并自动打开浏览器                                       |
| `npm run start:extension` | 构建扩展、注册本机 Companion，并打开 Chrome 扩展管理页和 OKX.AI 控制台（macOS） |
| `npm run build:web`       | 仅构建 Web 版到 `dist-web`                                                      |
| `npm run build:extension` | 仅构建浏览器扩展到 `dist`                                                       |
| `npm run build`           | 构建两种版本                                                                    |
| `npm run dev`             | 启动 Vite 热更新预览，使用模拟数据                                              |

`npm start` 是 `start:web` 的快捷入口。两种构建使用独立目录，不会相互覆盖。扩展首次启动仍需在 Chrome 管理页开启开发者模式、手动加载 `dist`；已加载的扩展在重建后点击刷新。`start:extension` 沿用当前 macOS Companion 安装方式。

### 从源码开发 Web 版

Web 版与 Chrome 扩展版共用界面和只读查询。Web 版不需要安装扩展或注册 Native Messaging Host；浏览器直接访问本机服务。需要 Node.js 22.14+、OnchainOS CLI，并由用户在本机完成 `onchainos wallet login`。

从源码启动：

```sh
npm ci
npm run start:web
```

默认选择空闲端口，自动打开浏览器。关闭标签页不会停止服务，在终端按 Ctrl+C 停止。指定固定端口可以保留该地址下的账户选择：

```sh
npm run start:web -- --port 43127
npm run start:web -- --no-open
```

服务只监听 `127.0.0.1`，启动地址包含随机凭证。请使用终端输出的完整地址；页面加载后会从地址栏移除凭证，并在当前标签页会话中保留。重启后需要使用新地址。页面仅通过同源、鉴权的 `/api/snapshot` 读取真实数据，连接失败不会切换模拟数据。浏览器开发预览仍由 `npm run dev` 提供。

### 打包分发

开发者可运行 `npm pack`，自动构建两种版本并生成 npm 安装包。用户可直接通过上方 npx 命令使用已发布版本；浏览器插件仍按插件安装步骤使用。

### 为什么做这个项目

OKX.AI 上的 Agent、服务与任务逐渐增多，但与个人相关的数据主要分散在 OnchainOS CLI 的不同命令和本机记录中。用户需要反复切换终端，才能确认自己有哪些身份、钱包地址、服务、调用、订阅和交易记录；当结果为空时，也很难立即判断是“确实没有数据”、登录失效，还是接口查询失败。

Onchain OS Console 希望补上这个个人控制台：不复制一套账户系统，也不托管用户数据，而是在用户已经使用的 OKX.AI 页面中，将本机 CLI 能确认的数据整理成带有来源状态的只读视图。它尤其解决以下问题：

- 将分散的 CLI 查询集中到一个界面，减少重复命令和上下文切换。
- 展示钱包地址、调用记录和付款/结算状态等容易遗漏的信息。
- 明确区分空数据、查询错误与暂不支持的数据，避免用占位内容制造“看起来完整”的假象。
- 沿用 OKX.AI 原生 header、footer 和页面滚动体验，不再依赖狭窄的插件侧边栏。

### 如何解决

```text
OKX.AI 专用路由
  → Chrome 扩展后台
  → Native Messaging
  → 本机 Node Companion
  → 只读 OnchainOS CLI 命令
```

扩展在 `/_onchain-os-console` 只替换原本的 404 内容区，并把隔离的控制台 iframe 嵌入其中。界面请求经扩展后台发送给 Native Messaging 宿主；Companion 由 Chrome 按需启动，并在 Native Messaging 端口存续期间复用。它按固定白名单调用 OnchainOS CLI，再将结果规范化后返回。

项目只接入已经通过 CLI 实际响应确认的结构化字段。登录有效时，每个已接入来源都会同时返回可用性状态；登录失效时则统一提示重新登录。因此界面可以说明“有数据”“当前为空”“查询失败”或“CLI 暂无结构化数据”，而不是猜测字段和业务结果。本机数据模式只提供查看能力，所有模拟操作只存在于隔离的开发预览中。

### 功能

- 在 OKX.AI 顶栏增加「控制台」入口，并在 `/_onchain-os-console` 替换 404 内容区；原生 header 与 footer 保持不变。
- 通过 Chrome Native Messaging 连接由 Chrome 按需启动的本机 Node Companion，再调用 OnchainOS CLI 获取数据快照；扩展页面本身不运行 Node。
- 汇总本机账户、Agent 身份与审核、ASP 服务、调用与任务、订阅、钱包地址、资产、流水、争议与评价。
- 设置页明确区分“有数据”“当前为空”“查询失败”和“暂无结构化数据”，不把空结果伪装成故障或业务状态。
- 自适应深色界面，以及支持筛选与详情查看的控制台交互。

### 环境要求

- Node.js 22.14+
- Chrome 116+ 桌面版
- 已安装并可运行 OnchainOS CLI

### 手动构建与安装扩展

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

### 安全模型

安全不是一句“只读”声明，而是由权限、调用路径和数据处理共同限制：

| 用户可能担心什么       | 项目如何限制风险                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 会读取私钥或助记词吗？ | 不读取 OnchainOS 凭证文件，不请求私钥、助记词或签名材料，也没有签名和交易入口。                                                                          |
| 会读取 OKX.AI 网页吗？ | 内容脚本只挂载导航和替换专用路由 DOM，并仅读取网页可访问的 `locale` Cookie 以跟随界面语言；不申请 `cookies` 或 `webRequest` 权限，也不解析网页账户数据。 |
| 能执行任意本机命令吗？ | Companion 协议只接受 `snapshot`；网页和扩展请求不能传入命令或参数。固定命令通过 `execFile` 参数数组执行，不经过 shell。                                  |
| 数据会发到哪里？       | 快照只在本机 Companion 与扩展 iframe 间传递；项目没有自建服务器、遥测或云同步。CLI 查询仍会按其自身配置访问 OKX 服务。                                   |
| OKX.AI 能读取快照吗？  | 控制台 iframe 是 `chrome-extension://` 独立来源，OKX.AI 页面脚本不能读取其中的数据；后台也只接受专用路由内的扩展 iframe。                                |
| 返回内容包含令牌吗？   | 数据进入扩展前会按已知敏感字段键名递归移除 Token、API Key、Session、TEE、私钥、助记词、签名和原始交易等内容。新增上游字段仍需持续审查。                  |

扩展仅申请 `storage`、`nativeMessaging` 和两个 OKX.AI HTTPS 域名权限。账户选择只保存在 `chrome.storage.local`，不进行云同步。每条 CLI 命令限制为 20 秒和 2 MB 输出；本机数据模式没有平台写入、领取、付款或登录操作。`companion:install` 只会在 Chrome 的 NativeMessagingHosts 目录注册宿主清单并创建固定启动脚本，不会安装系统守护进程。代码完全公开，安装前可以直接审查 [manifest](./public/manifest.json)、[扩展后台](./src/background.ts) 和 [Companion](./companion.mjs)。

对于支持且显式指定分页的查询，当前只读取第一页、最多 50 条；其他查询遵循 CLI 的默认返回范围。CLI 只有可读文本、没有稳定结构化输出的数据不会被猜测解析。

更多连接机制与命令范围见 [COMPANION.md](./COMPANION.md)。

---

## English

### Two ways to use the console

Both modes share the same interface and local, read-only queries. Both require **Node.js 22.14+** and an installed **OnchainOS CLI**. Complete `onchainos wallet login` locally before first use.

#### Option 1: Standalone web console (recommended)

No source checkout or browser extension is needed:

```sh
npx --yes okx-onchain-console@latest
```

This downloads the package, starts a local server, and opens the console in your default browser at `http://127.0.0.1:port`. You do not need to visit OKX.AI. If the browser does not open, use the complete URL printed in the terminal. Press **Ctrl+C** in the terminal to stop; closing the tab does not stop the server.

Use `npx --yes okx-onchain-console@latest --port 43127 --no-open` to choose a fixed port without opening a browser. The command does not install OnchainOS CLI or log in on your behalf.

#### Option 2: Chrome extension embedded in OKX.AI

The extension adds a Console entry to the OKX.AI header and renders the console inside the site, preserving its header, footer, and scrolling. Requires **Chrome 116+ desktop**. The current launcher and Companion installer support **macOS**:

```sh
git clone https://github.com/BiscuitCoder/okxai_console.git
cd okxai_console
npm ci
npm run start:extension
```

This builds the extension, registers the local Companion, and opens Chrome's extensions page and the OKX.AI console. For first-time setup:

1. Enable Developer mode at `chrome://extensions`.
2. Choose **Load unpacked** and select the project's `dist` directory.
3. Refresh [OKX.AI](https://www.okx.ai/) and click **Console** in the header.

Chrome starts the Companion on demand; no separate web server is needed. Reload the extension after rebuilding. Without the extension, `/_onchain-os-console` remains a normal 404 page.

### Web development and builds

Run `npm ci`, then `npm run start:web` to build and open the local web console. Node.js 22.14+ and a locally installed, authenticated OnchainOS CLI are required. The server binds only to `127.0.0.1`, chooses an available port, and opens a session-authenticated browser URL. Use `npm run start:web -- --port 43127 --no-open` for a fixed port without opening a browser; press Ctrl+C to stop. `npm start` is an alias for `start:web`.

`npm run build:web` builds to `dist-web`; `npm run build:extension` builds the Chrome extension to `dist`; `npm run build` builds both. On macOS, `npm run start:extension` builds the extension, registers the Companion, and opens Chrome's extensions page and OKX.AI. First-time users must manually load `dist`; existing users must reload the extension after rebuilding.

Run `npm pack` to build both modes and produce a distributable npm package. Users can run the published version with `npx --yes okx-onchain-console@latest`. `npm run dev` continues to use isolated demo data.

### Why this project exists

As the number of Agents, services, and tasks on OKX.AI grows, personal data remains spread across separate OnchainOS CLI commands and local records. Users must repeatedly switch to a terminal to understand their identities, wallet addresses, services, invocations, subscriptions, and transactions. An empty response also leaves an important ambiguity: there may be no data, the login may have expired, or the query may have failed.

Onchain OS Console fills that personal-console gap. It does not create another account system or host user data. Instead, it organizes data that the local CLI can verify into a read-only view with explicit source status inside the OKX.AI experience. In practical terms, it:

- Consolidates fragmented CLI queries and reduces repeated commands and context switching.
- Surfaces wallet addresses, invocation records, and payment or settlement status that are otherwise easy to miss.
- Separates empty data, failed queries, and unsupported data instead of filling the UI with invented placeholders.
- Reuses the native OKX.AI header, footer, and page scrolling rather than relying on a narrow extension sidebar.

### How it works

```text
Dedicated OKX.AI route
  → Chrome extension background
  → Native Messaging
  → Local Node companion
  → Read-only OnchainOS CLI commands
```

At `/_onchain-os-console`, the extension replaces only the original 404 content and embeds an isolated console iframe. UI requests go through the extension background to a Native Messaging host. Chrome starts the local companion on demand and reuses it while the Native Messaging port remains open. The companion invokes a fixed allowlist of OnchainOS CLI commands, normalizes their results, and returns the snapshot.

Only structured fields verified against real CLI responses are integrated. When the login is valid, every integrated source reports its availability; an expired login produces a single login warning. This lets the UI distinguish available, empty, failed, and currently unstructured data without guessing fields or business outcomes. Local-data mode is display-only; simulated actions exist only in the isolated development preview.

### Features

- Adds a Console entry to the OKX.AI header and replaces only the 404 content at `/_onchain-os-console`, preserving the native header and footer.
- Uses Chrome Native Messaging to connect to a local Node companion started on demand by Chrome. The companion calls the OnchainOS CLI for a data snapshot; Node does not run inside the extension page.
- Brings together local accounts, Agent identities and approval status, ASP services, invocations and tasks, subscriptions, wallet addresses, balances, transactions, disputes, and feedback.
- Clearly distinguishes available, empty, failed, and unstructured data instead of inventing values or treating an empty result as an error.
- Includes a responsive dark UI with filtering and record-detail interactions.

### Requirements

- Node.js 22.14+
- Chrome 116+ for desktop
- A working OnchainOS CLI installation

### Manual extension build and installation

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

### Security model

Security is enforced through permissions, the request path, and data handling—not merely by describing the product as “read-only.”

| Concern                          | Protection                                                                                                                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does it read private keys?       | It does not read OnchainOS credential files or request private keys, seed phrases, or signing material. There is no signing or transaction entry.                                                                                                     |
| Does it inspect the OKX.AI page? | The content script only mounts navigation and replaces the dedicated route DOM. It reads only the page-accessible `locale` cookie to follow the UI language; it has no `cookies` or `webRequest` permission and parses no account data from the page. |
| Can it run arbitrary commands?   | The companion accepts only `snapshot`; pages and extension requests cannot supply commands or arguments. Fixed commands use an `execFile` argument array without a shell.                                                                             |
| Where does the data go?          | Snapshots pass only between the local companion and extension iframe. The project has no backend, telemetry, or cloud sync. CLI queries still access OKX services according to their own configuration.                                               |
| Can OKX.AI read the snapshot?    | The console iframe has an isolated `chrome-extension://` origin, so OKX.AI page scripts cannot read its data. The background also accepts only the extension iframe on the dedicated route.                                                           |
| Can tokens reach the UI?         | Known sensitive field names are recursively removed, including tokens, API keys, sessions, TEE data, private keys, seed phrases, signatures, and raw transactions. New upstream fields still require review.                                          |

The extension requests only `storage`, `nativeMessaging`, and the two OKX.AI HTTPS host permissions. Account selection remains in `chrome.storage.local` and is not synced. Each CLI command has a 20-second timeout and a 2 MB output limit. Local-data mode has no platform write, claim, payment, or login operations. `companion:install` only registers a host manifest in Chrome's NativeMessagingHosts directory and creates a fixed launcher; it does not install a system daemon. The code is open for inspection: review the [manifest](./public/manifest.json), [extension background](./src/background.ts), and [companion](./companion.mjs) before installing.

For queries that support and explicitly specify pagination, the console currently reads only the first page, up to 50 records; other queries follow the CLI's default response range. Data without stable structured CLI output is not guessed or scraped.

See [COMPANION.md](./COMPANION.md) for the connection model and command scope.
