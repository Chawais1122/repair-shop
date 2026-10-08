'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Opens the print dialog once the receipt has rendered; the button reprints. */
export function PrintButton() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <Button size="sm" variant="outline" onClick={() => window.print()}>
      <Printer />
      Print
    </Button>
  );
}
