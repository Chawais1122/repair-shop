'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ClipboardList,
  Clock,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ShoppingCart,
  Ticket,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { logout } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ClockWidget } from './clock-widget';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Restrict to these roles; visible to everyone when omitted. */
  roles?: string[];
}

const NAV_SECTIONS: Array<{ title?: string; items: NavItem[] }> = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/tickets', label: 'Tickets', icon: Ticket },
      { href: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/pos', label: 'Point of sale', icon: ShoppingCart },
      { href: '/invoices', label: 'Invoices', icon: ReceiptText },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { href: '/inventory', label: 'Parts & products', icon: Package },
      { href: '/inventory/purchase-orders', label: 'Purchase orders', icon: ClipboardList },
      { href: '/inventory/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    title: 'Team',
    items: [
      { href: '/team', label: 'Employees', icon: IdCard, roles: ['ADMIN'] },
      { href: '/team/timesheets', label: 'Timesheets', icon: Clock },
    ],
  },
];

function visibleSections(role: string): Array<{ title?: string; items: NavItem[] }> {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.roles || i.roles.includes(role)),
  })).filter((s) => s.items.length > 0);
}

/** The most specific nav entry that prefixes the path, so /inventory/suppliers doesn't light up /inventory. */
function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

interface Props {
  userEmail: string;
  userRole: string;
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Wrench className="size-4" aria-hidden="true" />
      </div>
      <span className="text-base font-semibold tracking-tight">Repair Shop</span>
    </div>
  );
}

export function NavSidebar({ userEmail, userRole }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Cookies may already be cleared/expired; redirect to login regardless
    }
    router.push('/login');
    router.refresh();
  };

  const sections = visibleSections(userRole);
  const current = activeHref(
    pathname,
    sections.flatMap((s) => s.items.map((i) => i.href)),
  );

  const links = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Main navigation">
      {sections.map((section, idx) => (
        <div key={section.title ?? idx} className="space-y-1">
          {section.title && (
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = item.href === current;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="px-3 pb-4">
      <Separator className="mb-3 bg-sidebar-border" />
      <div className="mb-3">
        <ClockWidget />
      </div>
      <div className="px-3">
        <p className="truncate text-sm font-medium">{userEmail}</p>
        <p className="text-xs capitalize text-muted-foreground">{userRole.toLowerCase()}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-2 w-full justify-start gap-3 px-3 text-sidebar-foreground/70 hover:bg-sidebar-accent"
      >
        <LogOut aria-hidden="true" />
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <Brand />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu />
        </Button>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex w-64 flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SheetDescription className="sr-only">Main application navigation</SheetDescription>
          <div className="px-6 py-4">
            <Brand />
          </div>
          {links}
          {footer}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="px-6 py-5">
          <Brand />
        </div>
        {links}
        {footer}
      </aside>
    </>
  );
}
