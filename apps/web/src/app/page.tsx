export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Repair Shop Management
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Sign in to manage tickets, customers, and devices.
        </p>
        <a
          href="/login"
          className="mt-8 inline-block rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}
