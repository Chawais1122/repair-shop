import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTicketForm } from './create-ticket-form';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const mockFetch = jest.fn();
jest.mock('@/lib/api/client', () => ({
  clientFetch: (...args: unknown[]) => mockFetch(...args),
}));

describe('CreateTicketForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the customer search step initially', () => {
    render(<CreateTicketForm />);
    expect(screen.getByText('Select customer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by name or phone/i)).toBeInTheDocument();
  });

  it('searches for customers on button click', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      data: [{ id: 'cust-1', name: 'Alice Smith', phone: '+15551234567' }],
      meta: { page: 1, limit: 10, total: 1 },
    });

    render(<CreateTicketForm />);
    await user.type(screen.getByPlaceholderText(/search by name or phone/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  it('advances to device step when customer is selected', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        data: [{ id: 'cust-1', name: 'Alice Smith', phone: '+15551234567' }],
        meta: { page: 1, limit: 10, total: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'dev-1', brand: 'Apple', model: 'iPhone 13', type: 'PHONE', customerId: 'cust-1' }],
        meta: { page: 1, limit: 100, total: 1 },
      });

    render(<CreateTicketForm />);
    await user.type(screen.getByPlaceholderText(/search by name or phone/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => screen.getByText('Alice Smith'));
    await user.click(screen.getByText('Alice Smith'));

    await waitFor(() => {
      expect(screen.getByText(/Select device for Alice Smith/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Apple iPhone 13')).toBeInTheDocument();
  });

  it('advances to details step when device is selected', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        data: [{ id: 'cust-1', name: 'Alice Smith', phone: '+15551234567' }],
        meta: { page: 1, limit: 10, total: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'dev-1', brand: 'Apple', model: 'iPhone 13', type: 'PHONE', customerId: 'cust-1' }],
        meta: { page: 1, limit: 100, total: 1 },
      });

    render(<CreateTicketForm />);
    await user.type(screen.getByPlaceholderText(/search by name or phone/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => screen.getByText('Alice Smith'));
    await user.click(screen.getByText('Alice Smith'));
    await waitFor(() => screen.getByText('Apple iPhone 13'));
    await user.click(screen.getByText('Apple iPhone 13'));

    await waitFor(() => {
      expect(screen.getByText('Ticket details')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/describe the problem/i)).toBeInTheDocument();
  });

  it('shows an error when problem description is empty on submit', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        data: [{ id: 'cust-1', name: 'Alice Smith', phone: '+15551234567' }],
        meta: { page: 1, limit: 10, total: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'dev-1', brand: 'Apple', model: 'iPhone 13', type: 'PHONE', customerId: 'cust-1' }],
        meta: { page: 1, limit: 100, total: 1 },
      });

    render(<CreateTicketForm />);
    await user.type(screen.getByPlaceholderText(/search by name or phone/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => screen.getByText('Alice Smith'));
    await user.click(screen.getByText('Alice Smith'));
    await waitFor(() => screen.getByText('Apple iPhone 13'));
    await user.click(screen.getByText('Apple iPhone 13'));
    await waitFor(() => screen.getByText('Ticket details'));

    await user.click(screen.getByRole('button', { name: /create ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/problem description is required/i)).toBeInTheDocument();
    });
  });
});
