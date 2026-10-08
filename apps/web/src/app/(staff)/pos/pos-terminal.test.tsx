import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PosTerminal } from './pos-terminal';
import { clientFetch } from '@/lib/api/client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

const part = {
  id: 'p1',
  sku: 'USBC',
  name: 'USB-C Cable',
  category: null,
  description: null,
  costPrice: '2.00',
  sellPrice: '15.00',
  quantity: 2,
  lowStockThreshold: 1,
  isLowStock: false,
  isActive: true,
  supplier: null,
  createdAt: '',
  updatedAt: '',
};

function renderPos() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PosTerminal pickups={[]} preselectedTicket={null} />
    </QueryClientProvider>,
  );
}

describe('PosTerminal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockFetch.mockImplementation((path: string) => {
      if (path.startsWith('/parts')) {
        return Promise.resolve({ data: [part], meta: { page: 1, limit: 24, total: 1 } });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });
  });

  it('starts empty with charging disabled', async () => {
    renderPos();
    expect(screen.getByText(/add products or a repair/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /charge \$0\.00/i })).toBeDisabled();
  });

  it('adds products, caps quantity at stock and totals the sale', async () => {
    const user = userEvent.setup();
    renderPos();

    const tile = await screen.findByRole('button', { name: /usb-c cable/i });
    await user.click(tile);
    await user.click(tile);

    expect(screen.getByRole('button', { name: /increase usb-c cable/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /charge \$30\.00/i })).toBeEnabled();
    expect(within(tile).getByText('Sold out')).toBeInTheDocument();
  });

  it('applies tax and remembers the rate', async () => {
    const user = userEvent.setup();
    renderPos();

    await user.click(await screen.findByRole('button', { name: /usb-c cable/i }));
    const tax = screen.getByLabelText(/tax rate/i);
    await user.clear(tax);
    await user.type(tax, '10');

    expect(screen.getByRole('button', { name: /charge \$16\.50/i })).toBeInTheDocument();
    expect(window.localStorage.getItem('pos.taxRate')).toBe('10');
  });

  it('creates the invoice and opens payment', async () => {
    const user = userEvent.setup();
    renderPos();
    await user.click(await screen.findByRole('button', { name: /usb-c cable/i }));

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          id: 'inv-1',
          invoiceNumber: 'INV-00001',
          total: '15.00',
          amountPaid: '0.00',
          balanceDue: '15.00',
        },
      }),
    );
    await user.click(screen.getByRole('button', { name: /charge \$15\.00/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/invoices',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const body = JSON.parse(
      String(mockFetch.mock.calls.find(([p]) => p === '/invoices')![1]!.body),
    );
    expect(body).toMatchObject({
      items: [{ partId: 'p1', quantity: 1, unitPrice: 15 }],
      discount: 0,
      taxRate: 0,
    });
    expect(await screen.findByRole('dialog', { name: /take payment/i })).toBeInTheDocument();
  });
});
