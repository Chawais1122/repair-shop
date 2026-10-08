import type { PaymentMethod, UserRole } from '@repair-shop/shared';

export interface StaffPerformance {
  user: { id: string; name: string; role: UserRole };
  netSales: string;
  invoiceCount: number;
  repairsCompleted: number;
  hoursWorked: number;
  salesPerHour: string | null;
  periodTarget: string | null;
  targetProgress: number | null;
}

export interface Metrics {
  period: { from: string; to: string; days: number };
  sales: {
    invoiceCount: number;
    grossSales: string;
    netSales: string;
    tax: string;
    discounts: string;
    averageSale: string | null;
  };
  profit: {
    costOfGoods: string;
    grossProfit: string;
    grossMarginPercent: number | null;
    laborCost: string;
    profitAfterLabor: string;
  };
  productivity: { hoursWorked: number; revenuePerLaborHour: string | null };
  collected: {
    total: string;
    byMethod: Array<{ method: PaymentMethod; total: string; count: number }>;
  };
  repairs: {
    created: number;
    completed: number;
    cancelled: number;
    averageTurnaroundHours: number | null;
  };
  daily: Array<{ date: string; netSales: string; collected: string }>;
  topProducts: Array<{ partId: string; name: string; quantity: number; revenue: string }>;
  staff: StaffPerformance[];
}
