import Link from 'next/link';
import { getCustomers } from '@/lib/api/customers';
import { Pagination } from '@/components/shared/pagination';
import { ApiError } from '@/lib/api/client';

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CustomersPage({ searchParams }: Props) {
  const { search, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);

  let result;
  try {
    result = await getCustomers({ search, page, limit: 20 });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Your session has expired. Please{' '}
          <Link href="/login" className="font-medium underline">
            sign in again
          </Link>
          .
        </div>
      );
    }
    throw err;
  }

  const { data: customers, meta } = result;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `/customers?${params.toString()}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <Link
          href="/customers/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Add customer
        </Link>
      </div>

      <form action="/customers" method="get" className="mb-5 flex flex-wrap gap-2">
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <input
          id="customer-search"
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name, phone, or email…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-72"
        />
        <input type="hidden" name="page" value="1" />
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
        >
          Search
        </button>
        {search && (
          <Link
            href="/customers"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Clear
          </Link>
        )}
      </form>

      {customers.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500">
            {search ? `No customers found for "${search}".` : 'No customers yet.'}
          </p>
          {!search && (
            <Link
              href="/customers/new"
              className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Add your first customer →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Phone
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:table-cell">
                    Email
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:table-cell">
                    Added
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/customers/${c.id}`}
                        className="hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.phone}</td>
                    <td className="hidden px-4 py-3 text-sm text-gray-600 sm:table-cell">
                      {c.email ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3">
            <Pagination meta={meta} buildHref={buildHref} />
          </div>
        </div>
      )}
    </div>
  );
}
