import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecentTicketsTable } from './recent-tickets-table';
import type { RecentTicket } from '@/types/dashboard';
import { TicketStatus, Priority } from '@repair-shop/shared';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('./ticket-status-badge', () => ({
  TicketStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

const ticket: RecentTicket = {
  id: 't1',
  ticketNumber: 'TKT-0001',
  status: TicketStatus.RECEIVED,
  priority: Priority.NORMAL,
  customerName: 'John Smith',
  deviceLabel: 'Apple iPhone 14',
  createdAt: new Date('2026-01-15T10:00:00Z').toISOString(),
};

describe('RecentTicketsTable', () => {
  it('renders ticket rows with correct data', () => {
    render(<RecentTicketsTable tickets={[ticket]} />);
    expect(screen.getByText('TKT-0001')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Apple iPhone 14')).toBeInTheDocument();
    expect(screen.getByText('normal')).toBeInTheDocument();
  });

  it('links ticket number to ticket detail page', () => {
    render(<RecentTicketsTable tickets={[ticket]} />);
    const link = screen.getByRole('link', { name: 'TKT-0001' });
    expect(link).toHaveAttribute('href', '/tickets/t1');
  });

  it('shows empty state when no tickets', () => {
    render(<RecentTicketsTable tickets={[]} />);
    expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument();
  });

  it('renders multiple tickets', () => {
    const ticket2: RecentTicket = {
      ...ticket,
      id: 't2',
      ticketNumber: 'TKT-0002',
      customerName: 'Jane Doe',
    };
    render(<RecentTicketsTable tickets={[ticket, ticket2]} />);
    expect(screen.getByText('TKT-0001')).toBeInTheDocument();
    expect(screen.getByText('TKT-0002')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
