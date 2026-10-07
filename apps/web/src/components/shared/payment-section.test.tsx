import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { PaymentSection } from './payment-section';
import type { PaymentSummary } from '@/types/payment';
import { clientFetch } from '@/lib/api/client';

jest.mock('@/lib/api/client');
const mockClientFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });
}

function renderWith(summary: PaymentSummary) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <PaymentSection ticketId="ticket-1" initialSummary={summary} />
    </QueryClientProvider>,
  );
}

const emptySummary: PaymentSummary = {
  totalCost: null,
  paidAmount: '0',
  remainingAmount: null,
  isFullyPaid: false,
  payments: [],
};

const partialSummary: PaymentSummary = {
  totalCost: '100',
  paidAmount: '50',
  remainingAmount: '50',
  isFullyPaid: false,
  payments: [
    {
      id: 'p-1',
      ticketId: 'ticket-1',
      amount: '50',
      method: PaymentMethod.CASH,
      status: PaymentStatus.COMPLETED,
      transactionId: null,
      paidAt: '2024-01-01T10:00:00Z',
      notes: null,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
  ],
};

const paidSummary: PaymentSummary = {
  ...partialSummary,
  paidAmount: '100',
  remainingAmount: '0',
  isFullyPaid: true,
};

describe('PaymentSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows "No payments recorded" when there are none', () => {
    renderWith(emptySummary);
    expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument();
  });

  it('renders payment summary totals', () => {
    renderWith(partialSummary);
    expect(screen.getAllByText('$100.00')).toHaveLength(1);
    expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
  });

  it('shows "Paid in full" badge when fully paid', () => {
    renderWith(paidSummary);
    expect(screen.getByText('Paid in full')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add payment/i })).not.toBeInTheDocument();
  });

  it('shows existing payment entries', () => {
    renderWith(partialSummary);
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('toggles the add payment form', async () => {
    const user = userEvent.setup();
    renderWith(partialSummary);

    const addBtn = screen.getByRole('button', { name: /add payment/i });
    await user.click(addBtn);
    expect(screen.getByText('New payment')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('New payment')).not.toBeInTheDocument();
  });

  it('submits a new payment and refreshes the summary', async () => {
    const user = userEvent.setup();

    const updatedSummary: PaymentSummary = {
      ...partialSummary,
      paidAmount: '100',
      remainingAmount: '0',
      isFullyPaid: true,
    };

    mockClientFetch.mockImplementation((url: unknown, init?: unknown) => {
      const reqInit = init as RequestInit | undefined;
      if (reqInit?.method === 'POST') {
        return Promise.resolve({
          data: {
            id: 'p-2',
            ticketId: 'ticket-1',
            amount: '50',
            method: PaymentMethod.CASH,
            status: PaymentStatus.COMPLETED,
            transactionId: null,
            paidAt: null,
            notes: null,
            createdAt: '',
            updatedAt: '',
          },
        });
      }
      return Promise.resolve({ data: updatedSummary });
    });

    renderWith(partialSummary);

    await user.click(screen.getByRole('button', { name: /add payment/i }));
    await user.type(screen.getByLabelText(/amount/i), '50');
    await user.click(screen.getByRole('button', { name: /save payment/i }));

    await waitFor(() => {
      expect(mockClientFetch).toHaveBeenCalledWith(
        '/tickets/ticket-1/payments',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
