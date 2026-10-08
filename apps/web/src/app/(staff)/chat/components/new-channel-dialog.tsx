'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
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
import type { ChatChannel } from '@/types/chat';
import { CHANNELS_KEY } from '../query-keys';

interface Props {
  staff: Array<{ id: string; name: string }>;
  viewerId: string;
  onCreated: (channelId: string) => void;
}

export function NewChannelDialog({ staff, viewerId, onCreated }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [everyone, setEveryone] = useState(true);
  const [members, setMembers] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName('');
    setDescription('');
    setEveryone(true);
    setMembers([]);
    setError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) {
      setError('Use 2–40 lowercase letters, numbers and dashes');
      return;
    }
    if (!everyone && members.length === 0) {
      setError('Pick at least one member, or make the channel open to everyone');
      return;
    }
    setPending(true);
    setError('');
    try {
      const res = await clientFetch<{ data: ChatChannel }>('/chat/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: slug,
          description: description.trim() || undefined,
          isDefault: everyone,
          memberIds: everyone ? undefined : members,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
      onCreated(res.data.id);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the channel');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" aria-label="New channel">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New channel</DialogTitle>
          <DialogDescription>Group conversations by team, role or topic.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              placeholder="bench-techs"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (optional)</Label>
            <Input
              id="channel-description"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={everyone}
              onChange={(e) => setEveryone(e.target.checked)}
            />
            Open to all employees
          </label>
          {!everyone && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Members</legend>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {staff
                  .filter((s) => s.id !== viewerId)
                  .map((s) => (
                    <label key={s.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={members.includes(s.id)}
                        onChange={(e) =>
                          setMembers((m) => (e.target.checked ? [...m, s.id] : m.filter((x) => x !== s.id)))
                        }
                      />
                      {s.name}
                    </label>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">You are added automatically.</p>
            </fieldset>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Create channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
