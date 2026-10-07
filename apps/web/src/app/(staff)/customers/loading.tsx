export default function CustomersLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-32 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mb-4 h-10 w-64 animate-pulse rounded bg-gray-200" />
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-gray-100 p-4 last:border-0">
            <div className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
