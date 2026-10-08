import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@repair-shop/shared';
import { EmployeeForm } from './employee-form';
import { clientFetch } from '@/lib/api/client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));
jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

describe('EmployeeForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires an 8+ character password when creating', async () => {
    const user = userEvent.setup();
    render(<EmployeeForm mode="create" />);

    await user.type(screen.getByLabelText(/full name/i), 'Sam');
    await user.type(screen.getByLabelText(/email/i), 'sam@shop.com');
    await user.type(screen.getByLabelText(/temporary password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create employee/i }));

    expect(await screen.findByText('At least 8 characters')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('creates an employee with optional pay fields omitted when blank', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ data: {} });
    render(<EmployeeForm mode="create" />);

    await user.type(screen.getByLabelText(/full name/i), 'Sam');
    await user.type(screen.getByLabelText(/email/i), 'sam@shop.com');
    await user.type(screen.getByLabelText(/hourly rate/i), '21.5');
    await user.type(screen.getByLabelText(/temporary password/i), 'longenough');
    await user.click(screen.getByRole('button', { name: /create employee/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(JSON.parse(String(mockFetch.mock.calls[0]![1]!.body))).toEqual({
      name: 'Sam',
      email: 'sam@shop.com',
      role: UserRole.TECHNICIAN,
      password: 'longenough',
      hourlyRate: 21.5,
    });
  });

  it('sends null to clear pay fields when editing', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ data: {} });
    render(
      <EmployeeForm
        mode="edit"
        employee={{
          id: 'u1',
          email: 'sam@shop.com',
          name: 'Sam',
          role: UserRole.STAFF,
          isActive: true,
          phone: null,
          hourlyRate: '20.00',
          monthlySalesTarget: null,
          createdAt: '',
          updatedAt: '',
        }}
      />,
    );

    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    await user.clear(screen.getByLabelText(/hourly rate/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0]![0]).toBe('/users/u1');
    expect(JSON.parse(String(mockFetch.mock.calls[0]![1]!.body))).toMatchObject({
      hourlyRate: null,
      monthlySalesTarget: null,
      phone: null,
    });
  });
});
