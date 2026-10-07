import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/customers';
import { NavSidebar } from './nav-sidebar';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <NavSidebar userEmail={user.email} userRole={user.role} />
      <main className="flex-1 bg-gray-50 pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
