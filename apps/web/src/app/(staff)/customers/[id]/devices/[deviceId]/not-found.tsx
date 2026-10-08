import { NotFoundState } from '@/components/shared/not-found-state';

export default function DeviceNotFound() {
  return (
    <NotFoundState
      title="Device not found"
      description="This device may have been deleted or the URL is incorrect."
      backHref="/customers"
      backLabel="Back to customers"
    />
  );
}
