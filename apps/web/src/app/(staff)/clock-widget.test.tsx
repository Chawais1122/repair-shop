import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClockWidget } from './clock-widget';
import { clientFetch } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ clientFetch: jest.fn() }));
const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

function renderWidget() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ClockWidget />
    </QueryClientProvider>,
  );
}

describe('ClockWidget', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clocks in and shows the on-shift state', async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation((path: string) => {
      if (path === '/time-clock/me') {
        return Promise.resolve({
          data: { clockedIn: false, openEntry: null, todayMinutes: 0, weekMinutes: 125 },
        });
      }
      return Promise.resolve({
        data: {
          clockedIn: true,
          openEntry: { id: 'e1', clockIn: new Date().toISOString() },
          todayMinutes: 0,
          weekMinutes: 125,
        },
      });
    });

    renderWidget();
    expect(await screen.findByText('Off the clock')).toBeInTheDocument();
    expect(screen.getByText('2h 5m')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clock in/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/time-clock/clock-in', expect.anything()),
    );
    expect(await screen.findByRole('button', { name: /clock out/i })).toBeInTheDocument();
    expect(screen.getByText(/on shift/i)).toBeInTheDocument();
  });
});
