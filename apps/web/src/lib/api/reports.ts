import { cookies } from 'next/headers';
import { apiFetch } from './client';
import type { DashboardData } from '@/types/dashboard';
import type { Metrics } from '@/types/metrics';
import { serverGet } from './server';

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
}

export async function getDashboard(): Promise<DashboardData> {
  const cookieHeader = await getCookieHeader();
  const result = await apiFetch<{ data: DashboardData }>('/reports/dashboard', cookieHeader);
  return result.data;
}

export function getMetrics(params: { from: string; to: string }): Promise<Metrics> {
  return serverGet<Metrics>('/reports/metrics', params);
}
