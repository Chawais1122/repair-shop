import { clientFetch } from './client';

export async function logout(): Promise<void> {
  await clientFetch<unknown>('/auth/logout', { method: 'POST' });
}
