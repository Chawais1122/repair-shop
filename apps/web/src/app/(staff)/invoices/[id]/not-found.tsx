import { NotFoundState } from '@/components/shared/not-found-state';

export default function InvoiceNotFound() {
  return (
    <NotFoundState
      title="Invoice not found"
      description="This invoice may not exist or the URL is incorrect."
      backHref="/invoices"
      backLabel="Back to invoices"
    />
  );
}
