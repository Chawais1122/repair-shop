import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartForm } from './part-form';
import { clientFetch } from '@/lib/api/client';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

describe('PartForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    render(<PartForm mode="create" suppliers={[]} categories={[]} />);

    await user.click(screen.getByRole('button', { name: /create part/i }));

    await waitFor(() => {
      expect(screen.getByText('SKU is required')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Cost is required')).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects SKUs with spaces', async () => {
    const user = userEvent.setup();
    render(<PartForm mode="create" suppliers={[]} categories={[]} />);

    await user.type(screen.getByLabelText(/sku/i), 'BAD SKU');
    await user.click(screen.getByRole('button', { name: /create part/i }));

    expect(await screen.findByText('Letters, numbers, . _ and - only')).toBeInTheDocument();
  });

  it('posts a new part with opening stock and navigates to it', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ data: { id: 'part-9' } });
    render(<PartForm mode="create" suppliers={[]} categories={['Screens']} />);

    await user.type(screen.getByLabelText(/^name/i), 'iPhone 13 Screen');
    await user.type(screen.getByLabelText(/sku/i), 'SCR-13');
    await user.type(screen.getByLabelText(/cost/i), '40');
    await user.type(screen.getByLabelText(/selling price/i), '120');
    await user.clear(screen.getByLabelText(/opening stock/i));
    await user.type(screen.getByLabelText(/opening stock/i), '6');
    await user.click(screen.getByRole('button', { name: /create part/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [path, init] = mockFetch.mock.calls[0]!;
    expect(path).toBe('/parts');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      sku: 'SCR-13',
      costPrice: 40,
      sellPrice: 120,
      initialQuantity: 6,
    });
    expect(push).toHaveBeenCalledWith('/inventory/part-9');
  });

  it('shows the API error message on failure', async () => {
    const user = userEvent.setup();
    const { ApiError: Err } = jest.requireMock('@/lib/api/client') as {
      ApiError: new (status: number, msg: string) => Error;
    };
    mockFetch.mockRejectedValue(new Err(409, 'A part with SKU SCR-13 already exists'));
    render(<PartForm mode="create" suppliers={[]} categories={[]} />);

    await user.type(screen.getByLabelText(/^name/i), 'Screen');
    await user.type(screen.getByLabelText(/sku/i), 'SCR-13');
    await user.type(screen.getByLabelText(/cost/i), '1');
    await user.type(screen.getByLabelText(/selling price/i), '2');
    await user.click(screen.getByRole('button', { name: /create part/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });
});
