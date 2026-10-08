import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/customers';

// Bare layout for printable documents (receipts) — staff-only, no navigation chrome.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <div className="min-h-screen bg-white text-black">{children}</div>;
}
