import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeviceForm } from './device-form';
import { clientFetch } from '@/lib/api/client';
import { DeviceType } from '@repair-shop/shared';

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

const mockDevice = {
  id: 'dev-1',
  customerId: 'cust-1',
  type: DeviceType.PHONE,
  brand: 'Apple',
  model: 'iPhone 15',
  serialNumber: 'SN123',
  imei: null,
  hasPasscode: true,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('DeviceForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders required fields', () => {
    render(<DeviceForm mode="create" customerId="cust-1" />);

    expect(screen.getByLabelText(/device type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/brand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
  });

  it('shows validation errors when required fields are empty', async () => {
    render(<DeviceForm mode="create" customerId="cust-1" />);

    // Clear brand and model so they are empty
    const brandInput = screen.getByLabelText(/brand/i);
    const modelInput = screen.getByLabelText(/model/i);
    fireEvent.change(brandInput, { target: { value: '' } });
    fireEvent.change(modelInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(screen.getByText('Brand is required')).toBeInTheDocument();
      expect(screen.getByText('Model is required')).toBeInTheDocument();
    });
  });

  it('calls clientFetch with POST on create submit', async () => {
    const user = userEvent.setup();
    mockClientFetch.mockResolvedValue({ data: mockDevice });

    render(<DeviceForm mode="create" customerId="cust-1" />);

    await user.clear(screen.getByLabelText(/brand/i));
    await user.type(screen.getByLabelText(/brand/i), 'Samsung');
    await user.clear(screen.getByLabelText(/model/i));
    await user.type(screen.getByLabelText(/model/i), 'Galaxy S24');
    await user.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(mockClientFetch).toHaveBeenCalledWith(
        '/customers/cust-1/devices',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('pre-fills fields in edit mode', () => {
    render(<DeviceForm mode="edit" customerId="cust-1" device={mockDevice} />);

    expect(screen.getByLabelText(/brand/i)).toHaveValue('Apple');
    expect(screen.getByLabelText(/model/i)).toHaveValue('iPhone 15');
  });

  it('shows passcode hint in edit mode when hasPasscode is true', () => {
    render(<DeviceForm mode="edit" customerId="cust-1" device={mockDevice} />);

    expect(screen.getByText(/a passcode is stored/i)).toBeInTheDocument();
  });

  it('shows a server error when the API call fails', async () => {
    const user = userEvent.setup();
    const { ApiError: Err } = jest.requireMock('@/lib/api/client') as {
      ApiError: new (status: number, msg: string) => Error;
    };
    mockClientFetch.mockRejectedValue(new Err(400, 'Invalid device data'));

    render(<DeviceForm mode="create" customerId="cust-1" />);

    await user.type(screen.getByLabelText(/brand/i), 'Apple');
    await user.type(screen.getByLabelText(/model/i), 'iPhone 15');
    await user.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid device data');
    });
  });
});
