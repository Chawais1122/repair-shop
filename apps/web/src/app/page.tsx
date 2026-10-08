import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wrench className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Repair Shop Management</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sign in to manage tickets, customers, and devices.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
