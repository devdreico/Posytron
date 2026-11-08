export type Plan = "free" | "pro" | "premium";

export type TenantStatus =
  | "provisioned"
  | "onboarding_pending"
  | "setup_running"
  | "active";

export type Archetype =
  | "kiosk_single"
  | "retail_grid"
  | "supermarket_aisles"
  | "restaurant_tables"
  | "cafe_bar_counter"
  | "bakery_racks"
  | "pharmacy_shelves"
  | "services_rooms"
  | "workshop_bays"
  | "warehouse_bulk";

export type BusinessType =
  | "minimarket"
  | "kiosk"
  | "supermarket"
  | "restaurant"
  | "cafe"
  | "bakery"
  | "pharmacy"
  | "services"
  | "workshop"
  | "warehouse";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  plan: Plan;
  status: TenantStatus;
  createdAt: string;
  trialEndsAt?: string;
}

export interface BusinessProfile {
  admin: { firstName: string; lastName: string; role: "owner" | "admin" };
  business: {
    name: string;
    type: BusinessType;
    size: "small" | "medium" | "large";
    employees: number;
  };
  location: { country: string; city: string; address: string; timezone: string };
  ops: {
    inventory: boolean;
    credit: boolean;
    delivery: boolean;
    paymentMethods: string[];
    schedule: string;
  };
}

export interface ProcessProfile {
  tasks: string[];
  stages: Record<string, string[]>;
  recommendations: { pos: string; score: number; matched: string[] }[];
  active?: string[];
  completedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
}

export interface SaleLine {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Payment {
  method: string;
  amount: number;
}

export interface Sale {
  id: string;
  folio: string;
  at: string;
  items: SaleLine[];
  payments: Payment[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerId?: string;
  shiftId: string;
  cashier: string;
}

export interface Shift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  closingCount?: number;
  expected?: number;
  difference?: number;
  cashier: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  balance: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  balance: number;
  lastOrderAt?: string;
}

export interface PurchaseLine {
  productId: string;
  name: string;
  qty: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  folio: string;
  at: string;
  supplierId: string;
  lines: PurchaseLine[];
  total: number;
  status: "pending" | "received";
}

export interface Expense {
  id: string;
  at: string;
  category: string;
  amount: number;
  note: string;
}

export type EmployeeRole = "admin" | "supervisor" | "cashier";

export interface Employee {
  id: string;
  username: string;
  name: string;
  role: EmployeeRole;
  pin: string;
  active: boolean;
  createdAt: string;
}

export type ToolKind =
  | "query"
  | "report"
  | "calculator"
  | "action"
  | "automation"
  | "playbook"
  | "integration";

export interface Tool {
  key: string;
  name: string;
  description: string;
  category: string;
  kind: ToolKind;
  verticals: string[];
  impact: number;
  minPlan: Plan;
  aiEnabled: boolean;
  operation?: string;
  entity?: string;
  index?: number;
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
  tool?: string;
}

export interface AiSettings {
  provider: "google" | "openai" | "anthropic" | "groq" | "openrouter" | "deepseek" | "custom";
  apiKey: string;
  model: string;
  enabled: boolean;
  usedToday: number;
  usedHour: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface DB {
  tenant: Tenant | null;
  session: { role: "owner" | "admin" | "employee" | "superadmin"; name: string; employeeId?: string } | null;
  profile: BusinessProfile | null;
  process: ProcessProfile | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  expenses: Expense[];
  shifts: Shift[];
  employees: Employee[];
  tools: { pinned: string[]; lastUsed: string[] };
  ai: AiSettings;
  aiMessages: AiMessage[];
  audit: AuditEntry[];
  setupDone: boolean;
}
