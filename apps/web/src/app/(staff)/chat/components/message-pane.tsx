'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Hash, ImagePlus, Loader2, Lock, SendHorizonal, Ticket, Trash2 } from 'lucide-react';
import { ApiError, clientFetch, clientUpload } from '@/lib/api/client';
import { apiUrl, getChatSocket } from '@/lib/chat-socket';
import { cn } from '@/lib/utils';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { TicketStatus } from '@repair-shop/shared';
import type { ChatChannel, ChatMessage } from '@/types/chat';
import { CHANNELS_KEY, messagesKey } from '../query-keys';
import { ShareTicketDialog } from './share-ticket-dialog';

export interface MessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const GROUP_WINDOW_MS = 5 * 60_000;

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

interface Props {
  channel: ChatChannel;
  viewerId: string;
  isAdmin: boolean;
  typingNames: string[];
}

export function MessagePane({ channel, viewerId, isAdmin, typingNames }: Props) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const lastTypingSent = useRef(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: messagesKey(channel.id),
      queryFn: ({ pageParam }) =>
        clientFetch<{ data: MessagesPage }>(
          `/chat/channels/${channel.id}/messages?limit=50${pageParam ? `&before=${pageParam}` : ''}`,
        ).then((r) => r.data),
      initialPageParam: '',
      getNextPageParam: (last) => (last.hasMore ? last.messages[0]?.id : undefined),
      staleTime: Infinity,
    });

  // Pages are newest-first; each page is oldest-first
  const messages = data ? [...data.pages].reverse().flatMap((p) => p.messages) : [];
  const lastId = messages[messages.length - 1]?.id;

  // Opening a channel marks it read
  useEffect(() => {
    void clientFetch(`/chat/channels/${channel.id}/read`, { method: 'POST' })
      .then(() => queryClient.invalidateQueries({ queryKey: CHANNELS_KEY }))
      .catch(() => undefined);
  }, [channel.id, lastId, queryClient]);

  // Keep the view pinned to the newest message unless the reader scrolled up
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastId, isPending]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasNextPage && !isFetchingNextPage) {
      const previousHeight = el.scrollHeight;
      void fetchNextPage().then(() => {
        // Preserve the reading position when older messages are prepended
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - previousHeight;
        });
      });
    }
  }

  async function send(body: { body?: string; ticketId?: string }) {
    setSending(true);
    setError('');
    stickToBottom.current = true;
    try {
      await clientFetch(`/chat/channels/${channel.id}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Message not sent');
      return false;
    } finally {
      setSending(false);
    }
  }

  async function submitText() {
    const text = draft.trim();
    if (!text || sending) return;
    if (await send({ body: text })) setDraft('');
  }

  async function uploadPhoto(file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photos must be 5 MB or smaller');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    if (draft.trim()) form.append('caption', draft.trim());
    setSending(true);
    setError('');
    stickToBottom.current = true;
    try {
      await clientUpload(`/chat/channels/${channel.id}/photos`, form);
      setDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function remove(messageId: string) {
    try {
      await clientFetch(`/chat/messages/${messageId}`, { method: 'DELETE' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the message');
    }
  }

  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      getChatSocket().emit('typing', { channelId: channel.id });
    }
  }

  return (
    <>
      <header className="flex items-center gap-2 border-b px-4 py-3">
        {channel.isDefault ? (
          <Hash className="size-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <Lock className="size-4 text-muted-foreground" aria-label="Private channel" />
        )}
        <div className="min-w-0">
          <h2 className="truncate font-semibold leading-tight">{channel.name}</h2>
          {channel.description && (
            <p className="truncate text-xs text-muted-foreground">{channel.description}</p>
          )}
        </div>
        {!channel.isDefault && (
          <span className="ml-auto text-xs text-muted-foreground">
            {channel.memberIds.length} members
          </span>
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-0.5 overflow-y-auto px-4 py-3"
        aria-live="polite"
        aria-label={`Messages in ${channel.name}`}
      >
        {isFetchingNextPage && (
          <Loader2 className="mx-auto my-2 size-4 animate-spin text-muted-foreground" />
        )}
        {isPending ? (
          <Loader2 className="mx-auto mt-10 size-5 animate-spin text-muted-foreground" />
        ) : isError ? (
          <p className="mt-10 text-center text-sm text-destructive">Failed to load messages.</p>
        ) : messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello to the team!
          </p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            const grouped =
              !newDay &&
              prev?.author.id === m.author.id &&
              new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
            const canDelete = !m.deleted && (m.author.id === viewerId || isAdmin);
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    {dayLabel(m.createdAt)}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <article className={cn('group relative rounded-md px-2 py-0.5 hover:bg-muted/50', !grouped && 'mt-2')}>
                  {!grouped && (
                    <p className="text-sm">
                      <span className="font-semibold">{m.author.name}</span>{' '}
                      <time className="text-xs text-muted-foreground" dateTime={m.createdAt}>
                        {timeLabel(m.createdAt)}
                      </time>
                    </p>
                  )}
                  {m.deleted ? (
                    <p className="text-sm italic text-muted-foreground">Message deleted</p>
                  ) : (
                    <>
                      {m.body && <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>}
                      {m.ticket && (
                        <Link
                          href={`/tickets/${m.ticket.id}`}
                          className="mt-1 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent"
                        >
                          <Ticket className="size-4 text-muted-foreground" aria-hidden="true" />
                          <span className="font-medium">{m.ticket.ticketNumber}</span>
                          <TicketStatusBadge status={m.ticket.status as TicketStatus} />
                        </Link>
                      )}
                      {m.attachment && (
                        <a
                          href={apiUrl(m.attachment.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block w-fit"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API image, not optimisable */}
                          <img
                            src={apiUrl(m.attachment.url)}
                            alt={m.attachment.name}
                            loading="lazy"
                            className="max-h-64 max-w-full rounded-md border object-contain sm:max-w-sm"
                          />
                        </a>
                      )}
                    </>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void remove(m.id)}
                      aria-label="Delete message"
                      className="absolute right-1 top-1 rounded p-1 text-muted-foreground opacity-0 hover:bg-accent hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </article>
              </Fragment>
            );
          })
        )}
      </div>

      <footer className="border-t p-3">
        <p className="h-4 px-1 text-xs text-muted-foreground" aria-live="polite">
          {typingNames.length > 0 &&
            `${typingNames.join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing…`}
        </p>
        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitText();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPhoto(file);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Share a photo"
            disabled={sending}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus />
          </Button>
          <ShareTicketDialog disabled={sending} onShare={(ticketId) => send({ ticketId })} />
          <Textarea
            rows={1}
            value={draft}
            maxLength={4000}
            placeholder={`Message #${channel.name}`}
            aria-label={`Message #${channel.name}`}
            className="max-h-40 min-h-9 flex-1 resize-none"
            onChange={(e) => {
              setDraft(e.target.value);
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submitText();
              }
            }}
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={sending || !draft.trim()}>
            {sending ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
          </Button>
        </form>
      </footer>
    </>
  );
}
