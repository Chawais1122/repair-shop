import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PurchaseOrderStatus } from '@repair-shop/shared';
import { PurchaseOrderForm } from './purchase-order-form';
import { clientFetch } from '@/lib/api/client';
import type { PurchaseOrder } from '@/types/inventory';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

const order: PurchaseOrder = {
  id: 'po-1',
  poNumber: 'PO-0001',
  status: PurchaseOrderStatus.DRAFT,
  supplier: { id: 'sup-1', name: 'Parts Co' },
  notes: null,
  orderedAt: null,
  receivedAt: null,
  createdBy: { id: 'u1', name: 'Admin' },
  items: [
    {
      id: 'poi-1',
      part: { id: 'p1', sku: 'BAT-1', name: 'Battery' },
      quantity: 3,
      unitCost: '10.00',
      lineTotal: '30.00',
    },
  ],
  total: '30.00',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderForm(props: React.ComponentProps<typeof PurchaseOrderForm>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PurchaseOrderForm {...props} />
    </QueryClientProvider>,
  );
}

describe('PurchaseOrderForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a supplier and at least one part', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'create', suppliers: [] });

    await user.click(screen.getByRole('button', { name: /create draft/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((a) => a.textContent)).toEqual(
      expect.arrayContaining(['Select a supplier', 'Add at least one part']),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows the running total for existing lines', () => {
    renderForm({ mode: 'edit', suppliers: [], order });
    expect(screen.getByText('Battery (BAT-1)')).toBeInTheDocument();
    expect(screen.getAllByText('$30.00').length).toBeGreaterThanOrEqual(1);
  });

  it('sends only editable fields when saving a draft', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(undefined);
    renderForm({ mode: 'edit', suppliers: [], order });

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [path, init] = mockFetch.mock.calls[0]!;
    expect(path).toBe('/purchase-orders/po-1');
    expect(JSON.parse(String(init?.body))).toEqual({
      items: [{ partId: 'p1', quantity: 3, unitCost: 10 }],
    });
  });
});
