'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/tickets', label: 'Tickets' },
];

interface Props {
  userEmail: string;
  userRole: string;
}

export function NavSidebar({ userEmail, userRole }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const links = (
    <nav className="flex-1 space-y-1 px-2 py-2" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
            isActive(item.href)
              ? 'bg-indigo-700 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-gray-700 px-4 py-3">
      <p className="truncate text-xs text-gray-400">{userEmail}</p>
      <p className="mt-0.5 text-xs capitalize text-gray-600">{userRole.toLowerCase()}</p>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-gray-900 px-4 shadow md:hidden">
        <span className="text-base font-semibold text-white">Repair Shop</span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-md p-2 text-gray-300 hover:bg-gray-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-base font-semibold text-white">Repair Shop</span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {links}
          {footer}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col bg-gray-900">
        <div className="px-4 py-5">
          <span className="text-lg font-semibold tracking-tight text-white">Repair Shop</span>
        </div>
        {links}
        {footer}
      </aside>
    </>
  );
}
