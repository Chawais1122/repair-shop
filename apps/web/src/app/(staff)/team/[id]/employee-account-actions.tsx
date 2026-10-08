'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound, Loader2, UserCheck, UserX } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { passwordSchema } from '@/lib/validation/team';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StaffUser } from '@/types/team';

interface Props {
  employee: StaffUser;
  isSelf: boolean;
}

export function EmployeeAccountActions({ employee, isSelf }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function toggleActive() {
    setPending(true);
    setError('');
    try {
      await clientFetch(`/users/${employee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <ResetPasswordDialog employeeId={employee.id} name={employee.name} />
        {!isSelf && (
          <Button
            variant={employee.isActive ? 'destructive' : 'outline'}
            onClick={toggleActive}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : employee.isActive ? (
              <UserX />
            ) : (
              <UserCheck />
            )}
            {employee.isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        )}
      </div>
      {error && (
        <Alert variant="destructive" className="max-w-xs">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function ResetPasswordDialog({ employeeId, name }: { employeeId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const check = passwordSchema.safeParse(password);
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? 'Invalid password');
      return;
    }
    setPending(true);
    setError('');
    try {
      await clientFetch(`/users/${employeeId}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPassword('');
          setError('');
          setDone(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyRound />
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {name}</DialogTitle>
          <DialogDescription>Set a new temporary password and share it securely.</DialogDescription>
        </DialogHeader>
        {done ? (
          <>
            <p className="text-sm">Password updated.</p>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Set password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
