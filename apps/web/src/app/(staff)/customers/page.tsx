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
        <p className="text-sm text-red-600">Your session has expired. Please sign in again.</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Add customer
        </Link>
      </div>

      <form action="/customers" method="get" className="mb-4 flex gap-2">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name, phone, or email…"
          className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input type="hidden" name="page" value="1" />
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Search
        </button>
        {search && (
          <Link
            href="/customers"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </Link>
        )}
      </form>

      {customers.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          {search ? `No customers found for "${search}"` : 'No customers yet.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/customers/${c.id}`} className="hover:text-indigo-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3">
            <Pagination meta={meta} buildHref={buildHref} />
          </div>
        </div>
      )}
    </div>
  );
}
