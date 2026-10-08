import { IsDateString } from 'class-validator';
import { PaymentMethod, UserRole } from '@repair-shop/shared';

export class MetricsQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

export class StaffPerformanceDto {
  user!: { id: string; name: string; role: UserRole };
  netSales!: string;
  invoiceCount!: number;
  repairsCompleted!: number;
  hoursWorked!: number;
  /** Net sales per hour on the clock; null without recorded hours. */
  salesPerHour!: string | null;
  /** Monthly target prorated to the selected period; null when no target is set. */
  periodTarget!: string | null;
  /** 0–100+ percentage of the prorated target reached. */
  targetProgress!: number | null;
}

export class MetricsResponseDto {
  period!: { from: Date; to: Date; days: number };
  sales!: {
    invoiceCount: number;
    grossSales: string;
    netSales: string;
    tax: string;
    discounts: string;
    averageSale: string | null;
  };
  profit!: {
    costOfGoods: string;
    grossProfit: string;
    /** Gross profit as a percentage of net sales. */
    grossMarginPercent: number | null;
    laborCost: string;
    profitAfterLabor: string;
  };
  productivity!: {
    hoursWorked: number;
    /** Net sales per staff hour worked ("revenue per man hour"). */
    revenuePerLaborHour: string | null;
  };
  collected!: {
    total: string;
    byMethod: Array<{ method: PaymentMethod; total: string; count: number }>;
  };
  repairs!: {
    created: number;
    completed: number;
    cancelled: number;
    averageTurnaroundHours: number | null;
  };
  daily!: Array<{ date: string; netSales: string; collected: string }>;
  topProducts!: Array<{ partId: string; name: string; quantity: number; revenue: string }>;
  staff!: StaffPerformanceDto[];
}
