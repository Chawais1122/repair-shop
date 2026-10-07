export default function TicketsLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-28 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mb-4 flex gap-3">
        <div className="h-9 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-40 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
