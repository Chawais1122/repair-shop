import { NotFoundState } from '@/components/shared/not-found-state';

export default function PartNotFound() {
  return (
    <NotFoundState
      title="Part not found"
      description="This part may have been removed or the URL is incorrect."
      backHref="/inventory"
      backLabel="Back to inventory"
    />
  );
}
