interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'default' | 'green' | 'red' | 'blue' | 'orange';
}

export function StatCard({ label, value, sub, accent = 'default' }: Props) {
  const accentClasses: Record<string, string> = {
    default: 'text-gray-900',
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    orange: 'text-orange-500',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accentClasses[accent]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
