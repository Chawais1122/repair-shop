import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TicketItemsCard } from './ticket-items-card';
import { clientFetch } from '@/lib/api/client';
import type { TicketItemsSummary } from '@/types/inventory';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh }),
}));

jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

const summary: TicketItemsSummary = {
  items: [
    {
      id: 'i1',
      part: { id: 'p1', sku: 'SCR-13', name: 'iPhone 13 Screen' },
      description: 'iPhone 13 Screen',
      quantity: 1,
      unitPrice: '120.00',
      unitCost: '40.00',
      lineTotal: '120.00',
      createdBy: { id: 'u1', name: 'Tech' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'i2',
      part: null,
      description: 'Labor',
      quantity: 1,
      unitPrice: '35.00',
      unitCost: '0.00',
      lineTotal: '35.00',
      createdBy: { id: 'u1', name: 'Tech' },
      createdAt: new Date().toISOString(),
    },
  ],
  partsTotal: '120.00',
  laborTotal: '35.00',
  total: '155.00',
  costTotal: '40.00',
};

function renderCard(props: Partial<React.ComponentProps<typeof TicketItemsCard>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TicketItemsCard ticketId="t1" summary={summary} locked={false} finalCost={null} {...props} />
    </QueryClientProvider>,
  );
}

describe('TicketItemsCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists items with parts/labor totals', () => {
    renderCard();
    expect(screen.getByText('iPhone 13 Screen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove labor/i })).toBeInTheDocument();
    expect(screen.getByText('$155.00')).toBeInTheDocument();
  });

  it('removes an item and refreshes', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(undefined);
    renderCard();

    await user.click(screen.getByRole('button', { name: /remove labor/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/tickets/t1/items/i2', { method: 'DELETE' }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('offers to set the final cost from the items total', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(undefined);
    renderCard();

    await user.click(screen.getByRole('button', { name: /set final cost to \$155\.00/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/tickets/t1', {
        method: 'PATCH',
        body: JSON.stringify({ finalCost: 155 }),
      }),
    );
  });

  it('hides editing controls when the ticket is locked', () => {
    renderCard({ locked: true });
    expect(screen.queryByRole('button', { name: /add part/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set final cost/i })).not.toBeInTheDocument();
  });
});
