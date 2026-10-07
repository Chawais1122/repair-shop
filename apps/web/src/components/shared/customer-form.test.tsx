import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerForm } from './customer-form';
import { clientFetch } from '@/lib/api/client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

const mockClientFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

describe('CustomerForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders required fields', () => {
    render(<CustomerForm mode="create" />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows validation errors when required fields are empty', async () => {
    render(<CustomerForm mode="create" />);

    fireEvent.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Phone is required')).toBeInTheDocument();
    });
  });

  it('calls clientFetch with POST on create submit', async () => {
    const user = userEvent.setup();
    mockClientFetch.mockResolvedValue({ data: { id: 'new-id', name: 'Jane', phone: '+1234567890' } });

    render(<CustomerForm mode="create" />);

    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/phone/i), '+1234567890');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() => {
      expect(mockClientFetch).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('pre-fills fields in edit mode', () => {
    const customer = {
      id: 'cust-1',
      name: 'John Smith',
      phone: '+15551234567',
      email: 'john@example.com',
      address: '123 Main St',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<CustomerForm mode="edit" customer={customer} />);

    expect(screen.getByLabelText(/name/i)).toHaveValue('John Smith');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('+15551234567');
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
  });

  it('shows a server error when the API call fails', async () => {
    const user = userEvent.setup();
    const { ApiError: Err } = jest.requireMock('@/lib/api/client') as {
      ApiError: new (status: number, msg: string) => Error;
    };
    mockClientFetch.mockRejectedValue(new Err(409, 'Phone number already exists'));

    render(<CustomerForm mode="create" />);

    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/phone/i), '+1234567890');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Phone number already exists');
    });
  });
});
