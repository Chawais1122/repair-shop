import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Customers" value={42} />);
    expect(screen.getByText('Total Customers')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders optional sub-label', () => {
    render(<StatCard label="Revenue" value="$250.00" sub="last 30 days" />);
    expect(screen.getByText('last 30 days')).toBeInTheDocument();
  });

  it('does not render sub-label when omitted', () => {
    render(<StatCard label="Total" value={0} />);
    expect(screen.queryByText('last 30 days')).not.toBeInTheDocument();
  });

  it('applies accent color class for green', () => {
    const { container } = render(<StatCard label="x" value="0" accent="green" />);
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('applies accent color class for red', () => {
    const { container } = render(<StatCard label="x" value="0" accent="red" />);
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });
});
