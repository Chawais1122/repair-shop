import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DeviceType, Priority, TicketStatus } from '@repair-shop/shared';
import { TicketBoard, type BoardColumns } from './ticket-board';
import type { Ticket } from '@/types/ticket';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
}));

const baseTicket: Ticket = {
  id: 't1',
  ticketNumber: 'TKT-0001',
  status: TicketStatus.RECEIVED,
  priority: Priority.HIGH,
  reportedProblem: 'Cracked screen',
  diagnosis: null,
  estimatedCost: null,
  finalCost: null,
  receivedAt: new Date().toISOString(),
  expectedCompletionAt: null,
  completedAt: null,
  customer: { id: 'c1', name: 'Alice Smith', phone: '+15550000000' },
  device: { id: 'd1', brand: 'Apple', model: 'iPhone 13', type: DeviceType.PHONE },
  assignedTo: null,
  createdBy: { id: 'u1', name: 'Staff' },
  statusHistory: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeColumns(overrides: Partial<BoardColumns> = {}): BoardColumns {
  const empty = Object.fromEntries(
    Object.values(TicketStatus).map((s) => [s, { tickets: [], total: 0 }]),
  ) as unknown as BoardColumns;
  return { ...empty, ...overrides };
}

describe('TicketBoard', () => {
  it('renders a column per status with ticket counts', () => {
    render(
      <TicketBoard
        statuses={[TicketStatus.RECEIVED, TicketStatus.DIAGNOSING]}
        initialColumns={makeColumns({
          [TicketStatus.RECEIVED]: { tickets: [baseTicket], total: 1 },
        })}
      />,
    );

    const received = screen.getByRole('region', { name: /received column/i });
    expect(within(received).getByText('TKT-0001')).toBeInTheDocument();
    expect(within(received).getByText('Alice Smith')).toBeInTheDocument();
    expect(within(received).getByText('1')).toBeInTheDocument();

    const diagnosing = screen.getByRole('region', { name: /diagnosing column/i });
    expect(within(diagnosing).getByText('No tickets')).toBeInTheDocument();
  });

  it('links each card to the ticket detail page', () => {
    render(
      <TicketBoard
        statuses={[TicketStatus.RECEIVED]}
        initialColumns={makeColumns({
          [TicketStatus.RECEIVED]: { tickets: [baseTicket], total: 1 },
        })}
      />,
    );

    expect(screen.getByRole('link', { name: 'TKT-0001' })).toHaveAttribute('href', '/tickets/t1');
  });

  it('shows a truncation hint when a column has more tickets than displayed', () => {
    render(
      <TicketBoard
        statuses={[TicketStatus.DELIVERED]}
        initialColumns={makeColumns({
          [TicketStatus.DELIVERED]: {
            tickets: [{ ...baseTicket, status: TicketStatus.DELIVERED }],
            total: 40,
          },
        })}
      />,
    );

    expect(screen.getByText('Showing 1 of 40')).toBeInTheDocument();
  });
});
