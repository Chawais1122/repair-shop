import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailySalesChart } from './daily-sales-chart';

const data = [
  { date: '2026-10-05', value: 120 },
  { date: '2026-10-06', value: 0 },
  { date: '2026-10-07', value: 455.5 },
];

describe('DailySalesChart', () => {
  it('labels the chart for assistive tech and draws one bar per non-zero day', () => {
    const { container } = render(<DailySalesChart data={data} valueLabel="Net sales" />);
    expect(screen.getByRole('img', { name: 'Net sales per day' })).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('shows a tooltip with the day value on hover', () => {
    const { container } = render(<DailySalesChart data={data} valueLabel="Net sales" />);
    const hitTargets = container.querySelectorAll('rect');
    fireEvent.mouseEnter(hitTargets[2]!);
    expect(screen.getByText('$455.50')).toBeInTheDocument();
  });

  it('offers a table view of the same data', async () => {
    const user = userEvent.setup();
    render(<DailySalesChart data={data} valueLabel="Net sales" />);
    await user.click(screen.getByRole('button', { name: /show table/i }));
    expect(screen.getByRole('columnheader', { name: 'Net sales' })).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
  });

  it('says so when there were no sales', () => {
    render(
      <DailySalesChart data={[{ date: '2026-10-05', value: 0 }]} valueLabel="Net sales" />,
    );
    expect(screen.getByText('No sales in this period')).toBeInTheDocument();
  });
});
