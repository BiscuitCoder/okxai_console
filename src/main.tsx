import React, { useEffect, useId, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  FileCheck2,
  History,
  LayoutDashboard,
  Radio,
  RefreshCw,
  Scale,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { client } from "./client";
import { filterEvents } from "./data";
import { Drawer } from "./Drawer";
import { copy, localeFromDocument, translate, tutorialUrl } from "./locale";
import {
  operationLabels,
  type ConsoleEvent,
  type OperationDraft,
  type OperationKind,
  type OperationReceipt,
  type Snapshot,
} from "./domain";
import "./style.css";

const pageIcons = [
  LayoutDashboard,
  Users,
  Radio,
  FileCheck2,
  Wallet,
  Scale,
  History,
  Settings,
] as const;
const formatDate = (value: string, locale: string) =>
  new Date(value).toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
function Badge({ children }: { children: React.ReactNode }) {
  const text = String(children);
  return (
    <span
      className={`badge ${/驳回|异常|rejected|failed/i.test(text) ? "bad" : /待|未启用|review|pending/i.test(text) ? "pending" : /健康|注册|完成|确认|结算|在线|connected|complete/i.test(text) ? "good" : ""}`}
    >
      {children}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <CircleHelp size={22} />
      <p>{text}</p>
    </div>
  );
}
type SelectOption = { value: string; label: string };
function Select({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function show() {
    setActive(selectedIndex);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    button.current?.focus();
  }
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) return show();
      if (event.key === "Home") return setActive(0);
      if (event.key === "End") return setActive(options.length - 1);
      setActive((current) =>
        event.key === "ArrowDown"
          ? (current + 1) % options.length
          : (current - 1 + options.length) % options.length,
      );
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div
      ref={root}
      className={`select-control ${open ? "open" : ""} ${className ?? ""}`.trim()}
      onKeyDown={handleKeyDown}
    >
      <span className="sr-only">{label}</span>
      <button
        ref={button}
        type="button"
        className="select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
      >
        <span>{selected?.label ?? "Select"}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </button>
      {open && (
        <div
          className="select-menu"
          id={listId}
          role="listbox"
          aria-label={label}
        >
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              tabIndex={-1}
              id={`${listId}-${index}`}
              data-value={option.value}
              aria-selected={option.value === value}
              className={active === index ? "active" : ""}
              key={option.value}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check aria-hidden="true" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function App() {
  const locale = localeFromDocument();
  const ui = copy[locale];
  const t = (value: string) => translate(locale, value);
  const eventTitle = (value: string) =>
    value.replace(/^转入|^转出/, (prefix) => t(prefix));
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [accountId, setAccountId] = useState("");
  const [page, setPage] = useState(0);
  const [history, setHistory] = useState<OperationReceipt[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState(0);
  const [tab, setTab] = useState("all");
  const [detail, setDetail] = useState<ConsoleEvent | OperationReceipt>();
  const [draft, setDraft] = useState<OperationDraft>();
  const [step, setStep] = useState<"edit" | "confirm" | "done">("edit");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const accountRef = useRef("");
  async function boot() {
    setLoading(true);
    setError("");
    try {
      const [data, selected] = await Promise.all([
        client.snapshot(),
        client.selected(),
      ]);
      setSnapshot(data);
      const id = data.accounts.some((a) => a.id === selected)
        ? selected!
        : data.accounts[0].id;
      accountRef.current = id;
      setAccountId(id);
      setHistory(await client.history(id));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void boot();
  }, []);
  useEffect(() => {
    if (window.parent === window || typeof ResizeObserver === "undefined")
      return;
    const root = document.getElementById("root");
    if (!root) return;
    const publishHeight = () =>
      window.parent.postMessage(
        {
          source: "onchain-console",
          type: "RESIZE",
          height: Math.ceil(root.getBoundingClientRect().height),
        },
        "*",
      );
    const observer = new ResizeObserver(publishHeight);
    observer.observe(root);
    publishHeight();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (draft) dialog.current?.showModal();
    else dialog.current?.close();
  }, [!!draft]);
  function navigate(index: number) {
    setPage(index);
    setStatus("all");
    setTab("all");
  }
  async function switchAccount(id: string) {
    try {
      await client.select(id);
      accountRef.current = id;
      setAccountId(id);
      setHistory([]);
      setRole("all");
      setStatus("all");
      setDetail(undefined);
      setDraft(undefined);
      const records = await client.history(id);
      if (accountRef.current === id) setHistory(records);
    } catch (e) {
      setError(String(e));
    }
  }
  function start(kind: OperationKind, targetId: string, value: string) {
    setFormError("");
    setStep("edit");
    setDraft({
      id: crypto.randomUUID(),
      accountId,
      kind,
      targetId,
      value,
      createdAt: new Date().toISOString(),
    });
  }
  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    setFormError("");
    try {
      await client.rehearse(draft);
      setStep("done");
      setHistory(await client.history(accountId));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function openTutorial() {
    if (window.parent === window) location.assign(tutorialUrl);
    else
      window.parent.postMessage(
        { source: "onchain-console", type: "OPEN_TUTORIAL" },
        "*",
      );
  }
  if (!snapshot)
    return (
      <main className="startup">
        <Radio size={32} />
        <h1>Onchain OS Console</h1>
        <p>{loading ? ui.loading : error}</p>
        {!loading && <button onClick={boot}>{ui.reload}</button>}
      </main>
    );
  const registrationRequired =
    snapshot.mode === "live" &&
    snapshot.identities.length === 0 &&
    snapshot.sources?.find((item) => item.key === "identities")?.state ===
      "empty";
  if (registrationRequired)
    return (
      <main className="registration-gate">
        <ShieldCheck size={28} />
        <h1>{ui.registrationTitle}</h1>
        <p>{ui.registrationBody}</p>
        <button className="primary" onClick={openTutorial}>
          {ui.registrationAction} <ArrowUpRight size={16} />
        </button>
        <small>{ui.registrationHint}</small>
      </main>
    );
  const account = snapshot.accounts.find((a) => a.id === accountId)!;
  const accountDescription = account.description.replace(/ · 演示$/, "");
  const live = snapshot.mode === "live";
  const connectionLabel = snapshot.warnings?.length
    ? ui.connection
    : live
      ? ui.live
      : ui.demo;
  const identities = snapshot.identities.filter(
    (i) => i.accountId === accountId,
  );
  const services = snapshot.services.filter((s) => s.accountId === accountId);
  const wallet = snapshot.wallets.find((w) => w.accountId === accountId)!;
  const events = snapshot.events.filter((e) => e.accountId === accountId);
  const visibleIdentities = identities.filter(
    (i) => role === "all" || i.role === role,
  );
  const pendingReviews = identities.filter((item) =>
    /review|审核|pending/i.test(item.review),
  ).length;
  const pageKinds: Record<number, string[]> = {
    3: ["invocation", "task", "subscription"],
    4: live ? ["transaction"] : ["income", "transaction"],
    5: ["arbitration", "feedback"],
  };
  const availableRoles = [
    ...new Set(identities.map((item) => item.role)),
  ].filter((item) => item !== "Unknown");
  const source = (key: string) =>
    snapshot.sources?.find((item) => item.key === key);
  const emptyFor = (key: string, label: string) => {
    const localizedLabel = t(label);
    return source(key)?.state === "error"
      ? locale === "en"
        ? `Could not load ${localizedLabel}. See Settings for details.`
        : `${localizedLabel}${locale === "zh-Hant" ? "查詢失敗，詳情見設定。" : "查询失败，详情见设置。"}`
      : locale === "en"
        ? `No ${localizedLabel} found.`
        : locale === "zh-Hant"
          ? `查詢成功，目前沒有${localizedLabel}。`
          : `查询成功，当前没有${localizedLabel}。`;
  };
  const emptyForMany = (keys: string[], label: string) =>
    keys.some((key) => source(key)?.state === "error")
      ? locale === "en"
        ? `Some ${label} queries failed. See Settings for details.`
        : `${label}${locale === "zh-Hant" ? "存在查詢失敗項，詳情見設定。" : "存在查询失败项，详情见设置。"}`
      : locale === "en"
        ? `No ${label} found.`
        : locale === "zh-Hant"
          ? `查詢成功，目前沒有${label}。`
          : `查询成功，当前没有${label}。`;
  const list = events.filter(
    (e) =>
      pageKinds[page]?.includes(e.kind) && (tab === "all" || e.kind === tab),
  );
  const filtered = filterEvents(list, role, status, days);
  const pending = events.filter(
    (e) => e.status === "待审核" || e.status === "待处理",
  );
  const target =
    services.find((s) => s.id === draft?.targetId)?.name ??
    events.find((e) => e.id === draft?.targetId)?.title;
  const kindNames: Record<string, string> = {
    invocation: "调用",
    task: "任务",
    subscription: "订阅",
    income: "收入",
    transaction: "钱包流水",
    arbitration: "争议",
    feedback: "评价",
  };
  const filters = (
    <div className="filters">
      <Select
        label={ui.roleFilter}
        value={role}
        onChange={setRole}
        options={[
          { value: "all", label: ui.allRoles },
          ...availableRoles.map((item) => ({ value: item, label: item })),
        ]}
      />
      {pageKinds[page] && (
        <>
          <Select
            label={ui.statusFilter}
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: ui.allStatus },
              ...[...new Set(list.map((e) => e.status))].map((item) => ({
                value: item,
                label: item,
              })),
            ]}
          />
          <Select
            label={ui.timeRange}
            value={String(days)}
            onChange={(value) => setDays(Number(value))}
            options={[
              { value: "0", label: ui.allTime },
              { value: "7", label: ui.recent7 },
              { value: "30", label: ui.recent30 },
            ]}
          />
        </>
      )}
    </div>
  );
  const eventRows = (rows: ConsoleEvent[], emptyText?: string) =>
    rows.length ? (
      <div className="event-list">
        {rows.map((e) => (
          <button className="event-row" key={e.id} onClick={() => setDetail(e)}>
            <span className="event-icon">
              {e.kind === "income" || e.kind === "transaction" ? (
                <ArrowDownLeft size={17} />
              ) : (
                <Clock3 size={17} />
              )}
            </span>
            <span className="event-main">
              <strong>{eventTitle(e.title)}</strong>
              <small>
                {e.role} · {formatDate(e.createdAt, locale)}
              </small>
            </span>
            <span className="event-end">
              {e.amount && <strong>{e.amount} USDT</strong>}
              <Badge>{t(e.status)}</Badge>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
    ) : (
      <Empty text={emptyText ?? ui.empty} />
    );
  return (
    <div className="app-shell">
      <div className="workspace">
        <aside>
          <div className="account-menu">
            <div className="account-row">
              <Select
                className="account-picker"
                label={ui.account}
                value={accountId}
                onChange={(value) => void switchAccount(value)}
                options={snapshot.accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
              />
              <button
                className="icon-button"
                aria-label={ui.refresh}
                title={ui.refresh}
                disabled={loading}
                onClick={boot}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="account-meta">
              <i className={snapshot.warnings?.length ? "warning" : ""} />
              <span>{connectionLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{accountDescription}</span>
            </p>
          </div>
          <nav aria-label={ui.navigation}>
            {pageIcons
              .map((Icon, i) => ({ name: ui.pages[i], Icon, i }))
              .filter(({ i }) => !live || i !== 6)
              .map(({ name, Icon, i }) => (
                <button
                  key={name}
                  className={page === i ? "active" : ""}
                  onClick={() => navigate(i)}
                  aria-current={page === i ? "page" : undefined}
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  {i === 1 && pendingReviews > 0 && <b>{pendingReviews}</b>}
                </button>
              ))}
          </nav>
        </aside>
        <main>
          <div className="notice">
            <ShieldCheck size={16} />
            <span>
              {snapshot.warnings?.[0] ?? (live ? ui.readonly : ui.mock)}
            </span>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")}>{ui.close}</button>
            </div>
          )}
          {page === 0 && (
            <>
              <section className="balance-section">
                <div>
                  <p>{ui.walletTotal}</p>
                  <h2>
                    ${wallet.totalUsd.toFixed(2)} <small>USD</small>
                  </h2>
                  <span className="mono address">
                    {wallet.address || ui.addressUnavailable}
                  </span>
                </div>
                <button className="text-button" onClick={() => navigate(4)}>
                  {ui.viewWallet} <ArrowUpRight size={16} />
                </button>
              </section>
              <div className="metrics">
                <div>
                  <span>{ui.identities}</span>
                  <strong>{identities.length}</strong>
                </div>
                <div>
                  <span>{ui.attention}</span>
                  <strong>{pending.length.toString().padStart(2, "0")}</strong>
                </div>
                <div>
                  <span>{ui.services}</span>
                  <strong>{services.length}</strong>
                </div>
              </div>
              <section>
                <div className="section-title">
                  <h2>{ui.identityWorkspace}</h2>
                  <button className="text-button" onClick={() => navigate(1)}>
                    {ui.manageIdentities} <ChevronRight size={14} />
                  </button>
                </div>
                <div className="role-strip">
                  {availableRoles.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        navigate(1);
                        setRole(r);
                      }}
                    >
                      <span>{r}</span>
                      <strong>
                        {identities.filter((i) => i.role === r).length}
                      </strong>
                      <small>
                        {ui.items(
                          identities.filter((i) => i.role === r).length,
                        )}{" "}
                        <ChevronRight size={12} />
                      </small>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <div className="section-title">
                  <h2>{t("需要关注")}</h2>
                  <span className="muted">{ui.items(pending.length)}</span>
                </div>
                {eventRows(pending, t("当前没有需要处理的任务或争议。"))}
              </section>
              {!live && (
                <section>
                  <div className="section-title">
                    <h2>{t("最近操作")}</h2>
                    <button className="text-button" onClick={() => navigate(6)}>
                      {t("全部记录")} <ChevronRight size={14} />
                    </button>
                  </div>
                  {history.length ? (
                    history.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        className="receipt-row"
                        onClick={() => setDetail(r)}
                      >
                        <History size={17} />
                        <span>
                          {t(operationLabels[r.draft.kind])}
                          <small>{formatDate(r.completedAt, locale)}</small>
                        </span>
                        <Badge>{t("演练未执行")}</Badge>
                      </button>
                    ))
                  ) : (
                    <Empty
                      text={t("还没有演练记录。可前往服务页体验一次价格更新。")}
                    />
                  )}
                </section>
              )}
            </>
          )}
          {page === 1 && (
            <>
              {filters}
              {visibleIdentities.length ? (
                visibleIdentities.map((i) => (
                  <article className="identity" key={i.id}>
                    <div className="section-title">
                      <div>
                        <span className="eyebrow">
                          {i.role} / {i.id}
                        </span>
                        <h2>{i.name}</h2>
                      </div>
                      <Badge>{t(i.status)}</Badge>
                    </div>
                    <div className="facts">
                      <div>
                        <span>{t("上架审核")}</span>
                        <Badge>{t(i.review)}</Badge>
                      </div>
                      <div>
                        <span>{t("运行状态")}</span>
                        <strong>{i.online ? t("在线") : t("离线")}</strong>
                      </div>
                      <div>
                        <span>{t("评分")}</span>
                        <strong>
                          {i.rating ?? t("暂无")}
                          {i.rating && " / 5"}
                        </strong>
                      </div>
                    </div>
                    <p className="mono address">{i.address}</p>
                    <p className="muted">
                      {t("关联服务：")}
                      {i.serviceIds
                        .map((id) => services.find((s) => s.id === id)?.name)
                        .join("、") || t("无")}
                    </p>
                  </article>
                ))
              ) : (
                <Empty text={emptyFor("identities", "Agent 身份")} />
              )}
            </>
          )}
          {page === 2 && (
            <>
              {filters}
              {services
                .filter(() => role === "all" || role === "ASP")
                .map((s) => (
                  <article className="service" key={s.id}>
                    <div className="section-title">
                      <span className="eyebrow">
                        {s.type} / {s.id}
                      </span>
                      <Badge>{t(s.review)}</Badge>
                    </div>
                    <h2>{s.name}</h2>
                    <div className="price">
                      {s.price}
                      <small>
                        USDT /{" "}
                        {locale === "en"
                          ? "call"
                          : locale === "zh-Hant"
                            ? "次"
                            : "次"}
                      </small>
                    </div>
                    {s.description && (
                      <p className="description">{s.description}</p>
                    )}
                    <p className="muted">
                      {t("累计成交：")}
                      {s.volume}
                    </p>
                    <label className="endpoint">
                      Endpoint<code>{s.endpoint}</code>
                    </label>
                    {s.review === "已驳回" && (
                      <p className="rejection">
                        驳回原因：缺少参数规范与可运行调用示例。
                      </p>
                    )}
                    {!live && (
                      <div className="actions">
                        <button
                          onClick={() => start("price-update", s.id, s.price)}
                        >
                          演练调价
                        </button>
                        <button
                          onClick={() =>
                            start("service-update", s.id, s.endpoint)
                          }
                        >
                          更新服务
                        </button>
                        <button
                          onClick={() =>
                            start(
                              "review-submit",
                              s.id,
                              "补充参数规范与调用示例，申请上架审核。",
                            )
                          }
                        >
                          提交审核
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              {(!services.length || !["all", "ASP"].includes(role)) && (
                <Empty
                  text={
                    !["all", "ASP"].includes(role)
                      ? t("当前角色不提供 ASP 服务。")
                      : emptyFor("services", "ASP 服务")
                  }
                />
              )}
            </>
          )}
          {pageKinds[page] && (
            <>
              {page === 4 && (
                <section className="wallet-summary">
                  <div className="section-title">
                    <h2>
                      <CreditCard size={19} /> {t(wallet.chain)}
                    </h2>
                    <span className="muted">{t("资产")}</span>
                  </div>
                  <div className="wallet-addresses">
                    {(wallet.addresses?.length
                      ? wallet.addresses
                      : wallet.address
                        ? [{ network: "EVM", address: wallet.address }]
                        : []
                    ).map((item) => (
                      <div key={item.network}>
                        <span>{item.network}</span>
                        <code>{item.address}</code>
                      </div>
                    ))}
                  </div>
                  {wallet.assets.map((a) => (
                    <div className="asset" key={`${a.chain}:${a.symbol}`}>
                      <strong>
                        {a.symbol}
                        {a.chain && <small>{a.chain}</small>}
                      </strong>
                      <span>{a.balance}</span>
                      <span>${a.usd.toFixed(2)}</span>
                    </div>
                  ))}
                  {!wallet.assets.length && (
                    <Empty text={emptyFor("wallet-assets", "钱包资产")} />
                  )}
                </section>
              )}
              <div className="tabs">
                {["all", ...pageKinds[page]].map((t) => (
                  <button
                    className={tab === t ? "selected" : ""}
                    key={t}
                    onClick={() => {
                      setTab(t);
                      setStatus("all");
                    }}
                  >
                    {t === "all"
                      ? translate(locale, "全部")
                      : translate(locale, kindNames[t])}
                  </button>
                ))}
              </div>
              {filters}
              <p className="list-count">
                {filtered.length} {translate(locale, "条记录")}
              </p>
              {eventRows(
                filtered,
                page === 3
                  ? emptyForMany(
                      [
                        "a2mcp-invocations",
                        "tasks",
                        "user-tasks",
                        "buyer-subscriptions",
                        "provider-subscriptions",
                      ],
                      t("调用、任务或订阅"),
                    )
                  : page === 4
                    ? emptyFor("wallet-history", "钱包流水")
                    : emptyForMany(
                        ["arbitration", "refunds", "feedback"],
                        t("争议、退款或评价"),
                      ),
              )}
            </>
          )}
          {page === 6 && (
            <>
              {history.length ? (
                history.map((r) => (
                  <button
                    className="receipt-row"
                    key={r.id}
                    onClick={() => setDetail(r)}
                  >
                    <History size={18} />
                    <span>
                      <strong>{t(operationLabels[r.draft.kind])}</strong>
                      <small>
                        {formatDate(r.completedAt, locale)} · {r.draft.targetId}
                      </small>
                    </span>
                    <Badge>{t("演练未执行")}</Badge>
                    <ChevronRight size={15} />
                  </button>
                ))
              ) : (
                <Empty
                  text={t("暂无记录。前往服务页发起演练，确认后将在这里留档。")}
                />
              )}
            </>
          )}
          {page === 7 && (
            <>
              <section>
                <h2>{t("连接与数据")}</h2>
                <div className="setting-row">
                  <span>
                    {t("数据源")}
                    <small>{live ? "OnchainOS CLI" : t("本地模拟")}</small>
                  </span>
                  <Badge>{connectionLabel}</Badge>
                </div>
                <div className="setting-row">
                  <span>{t("本机 Companion")}</span>
                  <Badge>{live ? t("已连接") : t("开发预览")}</Badge>
                </div>
                <div className="setting-row">
                  <span>
                    {t("历史存储")}
                    <small>{t("浏览器本地")}</small>
                  </span>
                  <Badge>{t("仅本机")}</Badge>
                </div>
              </section>
              {!!snapshot.warnings?.length && (
                <section>
                  <h2>{t("数据状态")}</h2>
                  <ul className="data-warnings">
                    {snapshot.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              )}
              {!!snapshot.sources?.length && (
                <section>
                  <h2>{t("数据可用性")}</h2>
                  {snapshot.sources.map((item) => (
                    <div className="setting-row" key={item.key}>
                      <span>
                        {t(item.label)}
                        {item.detail && <small>{t(item.detail)}</small>}
                      </span>
                      <Badge>
                        {item.state === "available"
                          ? ui.items(item.count ?? 0)
                          : item.state === "empty"
                            ? t("当前为空")
                            : item.state === "error"
                              ? t("查询失败")
                              : t("暂无结构化数据")}
                      </Badge>
                    </div>
                  ))}
                </section>
              )}
              <section>
                <h2>{t("隐私边界")}</h2>
                <ul className="privacy">
                  <li>
                    {t(
                      "仅读取网页可访问的 locale Cookie 用于界面语言；不读取表单、钱包私钥或 Vercel 环境变量。",
                    )}
                  </li>
                  <li>{t("控制台仅通过本机 OnchainOS CLI 发起只读查询。")}</li>
                </ul>
              </section>
            </>
          )}
        </main>
      </div>
      <Drawer
        open={!!detail}
        label={t("记录详情")}
        onClose={() => setDetail(undefined)}
      >
        <div className="dialog-heading">
          <span className="eyebrow">{t("记录详情")}</span>
          <button
            aria-label={t("关闭详情")}
            className="icon-button"
            onClick={() => setDetail(undefined)}
          >
            <X size={20} />
          </button>
        </div>
        {detail &&
          ("draft" in detail ? (
            <>
              <h2>{t(operationLabels[detail.draft.kind])}</h2>
              <Badge>{t("演练未执行")}</Badge>
              <p className="notice">{detail.message}</p>
              <dl>
                <dt>{t("目标")}</dt>
                <dd>{detail.draft.targetId}</dd>
                <dt>{t("变更内容")}</dt>
                <dd>{detail.draft.value}</dd>
                <dt>{t("时间")}</dt>
                <dd>{formatDate(detail.completedAt, locale)}</dd>
                <dt>{t("本地回执 ID")}</dt>
                <dd>{detail.id}</dd>
                <dt>{t("链上交易")}</dt>
                <dd>{t("无 · 没有外部影响")}</dd>
              </dl>
            </>
          ) : (
            <>
              <h2>{detail.title}</h2>
              <Badge>{t(detail.status)}</Badge>
              <dl>
                <dt>{t("角色")}</dt>
                <dd>{detail.role}</dd>
                <dt>{t("时间")}</dt>
                <dd>{formatDate(detail.createdAt, locale)}</dd>
                {detail.amount && (
                  <>
                    <dt>{t("金额")}</dt>
                    <dd>{detail.amount} USDT</dd>
                  </>
                )}
                <dt>{t("详情 / 原因")}</dt>
                <dd>{detail.detail}</dd>
                <dt>{t("引用")}</dt>
                <dd>{detail.reference ?? t("无真实平台或链上引用")}</dd>
              </dl>
              {!live &&
                detail.kind === "income" &&
                detail.status === "待领取" && (
                  <button
                    className="primary"
                    onClick={() => {
                      setDetail(undefined);
                      start("reward-claim", detail.id, detail.amount!);
                    }}
                  >
                    申领奖励
                  </button>
                )}
            </>
          ))}
      </Drawer>
      <dialog
        ref={dialog}
        className="operation-dialog"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setDraft(undefined);
        }}
      >
        <div className="dialog-heading">
          <span className="eyebrow">{t("模拟演练")}</span>
          <button
            disabled={busy}
            className="icon-button"
            aria-label={t("关闭演练")}
            onClick={() => setDraft(undefined)}
          >
            <X size={20} />
          </button>
        </div>
        {draft && (
          <>
            <h2>
              {step === "done"
                ? t("演练未执行")
                : t(operationLabels[draft.kind])}
            </h2>
            <p className="description">
              {step === "edit"
                ? t("01 填写变更 → 02 确认卡 → 03 本地回执")
                : step === "confirm"
                  ? t("02 / 请核对以下内容，再确认保存演练")
                  : t("03 / 本地回执已保存")}
            </p>
            {step === "done" ? (
              <>
                <div className="success-mark">
                  <Check size={28} />
                </div>
                <p>
                  {t(
                    "未提交到 OKX/链上。账户资产、服务价格和审核状态均未改变。",
                  )}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setDraft(undefined);
                    navigate(6);
                  }}
                >
                  查看操作记录
                </button>
              </>
            ) : (
              <>
                <p>
                  <strong>{target}</strong>
                </p>
                {step === "edit" ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setFormError("");
                      setStep("confirm");
                    }}
                  >
                    <label className="form-label">
                      {draft.kind === "price-update"
                        ? t("单次价格（USDT）")
                        : draft.kind === "service-update"
                          ? "HTTPS Endpoint"
                          : draft.kind === "reward-claim"
                            ? t("奖励金额（USDT）")
                            : t("审核说明")}
                      <input
                        autoFocus
                        required
                        maxLength={500}
                        readOnly={draft.kind === "reward-claim"}
                        type={
                          draft.kind === "service-update"
                            ? "url"
                            : draft.kind === "price-update"
                              ? "number"
                              : "text"
                        }
                        min={0}
                        max={1000000}
                        step="0.000001"
                        value={draft.value}
                        onChange={(e) =>
                          setDraft({ ...draft, value: e.target.value })
                        }
                      />
                    </label>
                    <p className="footnote">
                      不要填写任何密钥或敏感信息。此内容将保存至本机。
                    </p>
                    <button className="primary" type="submit">
                      下一步：核对确认卡
                    </button>
                  </form>
                ) : (
                  <>
                    <dl>
                      <dt>{t("账户")}</dt>
                      <dd>{account.name}</dd>
                      <dt>{t("目标")}</dt>
                      <dd>{draft.targetId}</dd>
                      {draft.kind === "price-update" && (
                        <>
                          <dt>{t("原价格")}</dt>
                          <dd>
                            {
                              services.find((s) => s.id === draft.targetId)
                                ?.price
                            }{" "}
                            USDT
                          </dd>
                        </>
                      )}
                      <dt>{t("演练内容")}</dt>
                      <dd>
                        {draft.value}
                        {["price-update", "reward-claim"].includes(
                          draft.kind,
                        ) && " USDT"}
                      </dd>
                      <dt>{t("执行范围")}</dt>
                      <dd>{t("仅本机记录，无真实提交、扣费或签名。")}</dd>
                    </dl>
                    <div className="actions">
                      <button disabled={busy} onClick={() => setStep("edit")}>
                        返回修改
                      </button>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={save}
                      >
                        {busy ? t("正在保存…") : t("确认演练")}
                      </button>
                    </div>
                  </>
                )}
                {formError && (
                  <p className="error" role="alert">
                    {formError}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
