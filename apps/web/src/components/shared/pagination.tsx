import Link from 'next/link';
import type { PaginationMeta } from '@repair-shop/shared';

interface Props {
  meta: PaginationMeta;
  buildHref: (page: number) => string;
}

export function Pagination({ meta, buildHref }: Props) {
  const { page, limit, total } = meta;
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
      <p className="text-sm text-gray-600">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-400">
            Previous
          </span>
        )}

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-400">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
