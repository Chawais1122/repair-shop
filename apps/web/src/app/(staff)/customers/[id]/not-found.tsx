import { NotFoundState } from '@/components/shared/not-found-state';

export default function CustomerNotFound() {
  return (
    <NotFoundState
      title="Customer not found"
      description="This customer may have been deleted or the URL is incorrect."
      backHref="/customers"
      backLabel="Back to customers"
    />
  );
}
