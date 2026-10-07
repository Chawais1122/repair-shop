import { cookies } from 'next/headers';
import { apiFetch } from './client';
import type { DashboardData } from '@/types/dashboard';

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
}

export async function getDashboard(): Promise<DashboardData> {
  const cookieHeader = await getCookieHeader();
  const result = await apiFetch<{ data: DashboardData }>('/reports/dashboard', cookieHeader);
  return result.data;
}
