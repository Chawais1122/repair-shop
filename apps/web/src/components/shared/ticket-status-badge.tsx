'use client';

import { TicketStatus } from '@repair-shop/shared';

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.RECEIVED]: 'Received',
  [TicketStatus.DIAGNOSING]: 'Diagnosing',
  [TicketStatus.WAITING_APPROVAL]: 'Waiting Approval',
  [TicketStatus.APPROVED]: 'Approved',
  [TicketStatus.REPAIRING]: 'Repairing',
  [TicketStatus.READY]: 'Ready',
  [TicketStatus.DELIVERED]: 'Delivered',
  [TicketStatus.CANCELLED]: 'Cancelled',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.RECEIVED]: 'bg-gray-100 text-gray-700',
  [TicketStatus.DIAGNOSING]: 'bg-blue-100 text-blue-700',
  [TicketStatus.WAITING_APPROVAL]: 'bg-yellow-100 text-yellow-700',
  [TicketStatus.APPROVED]: 'bg-indigo-100 text-indigo-700',
  [TicketStatus.REPAIRING]: 'bg-purple-100 text-purple-700',
  [TicketStatus.READY]: 'bg-green-100 text-green-700',
  [TicketStatus.DELIVERED]: 'bg-teal-100 text-teal-700',
  [TicketStatus.CANCELLED]: 'bg-red-100 text-red-700',
};

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
