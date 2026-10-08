import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethod } from '@repair-shop/shared';
import { TakePaymentDialog } from './take-payment-dialog';
import { clientFetch } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

function renderDialog(onPaid = jest.fn()) {
  render(
    <TakePaymentDialog
      open
      onOpenChange={jest.fn()}
      invoiceId="inv-1"
      invoiceNumber="INV-00001"
      balanceDue="42.50"
      onPaid={onPaid}
    />,
  );
  return onPaid;
}

describe('TakePaymentDialog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('defaults the amount to the balance due', () => {
    renderDialog();
    expect(screen.getByLabelText(/amount to charge/i)).toHaveValue(42.5);
    expect(screen.getByRole('button', { name: /charge \$42\.50/i })).toBeInTheDocument();
  });

  it('shows change due for cash', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/cash received/i), '50');

    expect(screen.getByText('$7.50')).toBeInTheDocument();
  });

  it('blocks amounts above the balance without calling the API', async () => {
    const user = userEvent.setup();
    renderDialog();

    const amount = screen.getByLabelText(/amount to charge/i);
    await user.clear(amount);
    await user.type(amount, '100');
    await user.click(screen.getByRole('button', { name: /charge/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot exceed the balance/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('records a card payment with its reference and reports back', async () => {
    const user = userEvent.setup();
    const invoice = { id: 'inv-1', balanceDue: '0.00' };
    mockFetch.mockResolvedValue({ data: invoice });
    const onPaid = renderDialog();

    await user.click(screen.getByRole('button', { name: /card/i }));
    await user.type(screen.getByLabelText(/reference/i), 'AUTH123');
    await user.click(screen.getByRole('button', { name: /charge \$42\.50/i }));

    await waitFor(() => expect(onPaid).toHaveBeenCalledWith(invoice, 0));
    expect(mockFetch).toHaveBeenCalledWith('/invoices/inv-1/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount: 42.5,
        method: PaymentMethod.CARD,
        transactionId: 'AUTH123',
      }),
    });
  });
});
