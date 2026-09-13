export type Role = "User" | "ASP" | "Evaluator" | "Unknown";
export interface Account {
  id: string;
  name: string;
  address: string;
  description: string;
}
export interface Identity {
  id: string;
  accountId: string;
  name: string;
  role: Role;
  status: string;
  review: string;
  rejection?: string;
  online: boolean;
  address: string;
  rating: number | null;
  picture?: string;
  serviceIds: string[];
}
export interface Service {
  id: string;
  accountId: string;
  identityId: string;
  name: string;
  type: "A2A" | "A2MCP" | "未知";
  price: string;
  endpoint: string;
  description: string;
  icon?: string;
  volume: number;
  review: string;
}
export interface DataSourceStatus {
  key: string;
  label: string;
  state: "available" | "empty" | "error" | "unsupported";
  count?: number;
  detail?: string;
}
export type EventKind =
  | "review"
  | "invocation"
  | "task"
  | "subscription"
  | "income"
  | "arbitration"
  | "feedback"
  | "transaction";
export interface ConsoleEvent {
  id: string;
  accountId: string;
  kind: EventKind;
  role: Role;
  title: string;
  status: string;
  createdAt: string;
  amount?: string;
  detail: string;
  reference?: string;
}
export interface Wallet {
  accountId: string;
  address: string;
  chain: string;
  totalUsd: number;
  addresses?: {
    network: string;
    address: string;
  }[];
  assets: {
    symbol: string;
    balance: string;
    usd: number;
    chain?: string;
  }[];
}
export interface Snapshot {
  accounts: Account[];
  identities: Identity[];
  services: Service[];
  wallets: Wallet[];
  events: ConsoleEvent[];
  capturedAt: string;
  mode: "mock" | "live";
  warnings?: string[];
  sources?: DataSourceStatus[];
}
export type OperationKind =
  "price-update" | "review-submit" | "reward-claim" | "service-update";
export interface OperationDraft {
  id: string;
  accountId: string;
  kind: OperationKind;
  targetId: string;
  value: string;
  createdAt: string;
}
export interface OperationReceipt {
  id: string;
  draft: OperationDraft;
  completedAt: string;
  status: "simulated";
  message: string;
  externalEffect: false;
}
// SQLite Companion 可替换此接口；首版仅本地存储，无付款凭证或网页内容。
export interface HistoryRepository {
  list(accountId: string): Promise<OperationReceipt[]>;
  append(receipt: OperationReceipt): Promise<void>;
  getSelectedAccount(): Promise<string | null>;
  selectAccount(id: string): Promise<void>;
}
export interface OnchainDataSource {
  getSnapshot(): Promise<Snapshot>;
  getAccounts(): Promise<Account[]>;
  getWallet(accountId: string): Promise<Wallet | undefined>;
  getIdentities(accountId: string): Promise<Identity[]>;
  getServices(accountId: string): Promise<Service[]>;
  getEvents(accountId: string, kind?: EventKind): Promise<ConsoleEvent[]>;
  rehearse(
    draft: OperationDraft,
    confirmed: boolean,
  ): Promise<OperationReceipt>;
}
export const operationLabels: Record<OperationKind, string> = {
  "price-update": "更新价格",
  "review-submit": "提交审核",
  "reward-claim": "申领奖励",
  "service-update": "更新服务",
};
