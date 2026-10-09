import { RefreshSession } from './refresh-session';

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function RefreshPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return <RefreshSession next={next} />;
}
