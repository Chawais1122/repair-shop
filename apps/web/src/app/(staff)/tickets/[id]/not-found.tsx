import { NotFoundState } from '@/components/shared/not-found-state';

export default function TicketNotFound() {
  return (
    <NotFoundState
      title="Ticket not found"
      description="This ticket may have been deleted or the URL is incorrect."
      backHref="/tickets"
      backLabel="Back to tickets"
    />
  );
}
