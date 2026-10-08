import { notFound } from 'next/navigation';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { ApiError } from '@/lib/api/client';
import { getInvoice } from '@/lib/api/invoices';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PrintButton } from './print-button';

interface Props {
  params: Promise<{ id: string }>;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.BANK_TRANSFER]: 'Bank transfer',
};

const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME ?? 'Repair Shop';

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params;

  let invoice;
  try {
    invoice = await getInvoice(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const completedPayments = invoice.payments.filter((p) => p.status === PaymentStatus.COMPLETED);

  return (
    <main className="mx-auto max-w-sm px-6 py-8 font-mono text-sm print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <header className="text-center">
        <h1 className="text-lg font-bold">{SHOP_NAME}</h1>
        <p>Receipt {invoice.invoiceNumber}</p>
        <p>{formatDateTime(invoice.createdAt)}</p>
        {invoice.status === InvoiceStatus.VOID && <p className="mt-2 font-bold">*** VOID ***</p>}
      </header>

      <hr className="my-4 border-dashed border-black" />

      {invoice.customer && (
        <p>
          Customer: {invoice.customer.name}
          <br />
          {invoice.customer.phone}
        </p>
      )}
      {invoice.ticket && <p>Repair: {invoice.ticket.ticketNumber}</p>}
      <p>Served by: {invoice.createdBy.name}</p>

      <hr className="my-4 border-dashed border-black" />

      <table className="w-full">
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="pb-1 pr-2">
                {item.description}
                {item.quantity > 1 && (
                  <div className="text-xs">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </div>
                )}
              </td>
              <td className="pb-1 text-right">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-4 border-dashed border-black" />

      <dl className="space-y-1">
        <Row label="Subtotal" value={formatCurrency(invoice.subtotal)} />
        {Number(invoice.discount) > 0 && (
          <Row label="Discount" value={`-${formatCurrency(invoice.discount)}`} />
        )}
        <Row label={`Tax (${Number(invoice.taxRate)}%)`} value={formatCurrency(invoice.taxAmount)} />
        <Row label="TOTAL" value={formatCurrency(invoice.total)} bold />
      </dl>

      {completedPayments.length > 0 && (
        <>
          <hr className="my-4 border-dashed border-black" />
          <dl className="space-y-1">
            {completedPayments.map((p) => (
              <Row key={p.id} label={METHOD_LABELS[p.method]} value={formatCurrency(p.amount)} />
            ))}
            <Row
              label="Balance due"
              value={formatCurrency(Math.max(0, Number(invoice.balanceDue)))}
              bold
            />
          </dl>
        </>
      )}

      <hr className="my-4 border-dashed border-black" />
      <p className="text-center">Thank you for your business!</p>
    </main>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
