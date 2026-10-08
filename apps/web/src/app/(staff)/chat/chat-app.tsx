'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Hash, Loader2, Lock, MessagesSquare } from 'lucide-react';
import { clientFetch } from '@/lib/api/client';
import { getChatSocket } from '@/lib/chat-socket';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { ChatChannel, ChatMessage } from '@/types/chat';
import { MessagePane, type MessagesPage } from './components/message-pane';
import { NewChannelDialog } from './components/new-channel-dialog';
import { CHANNELS_KEY, messagesKey } from './query-keys';

interface Props {
  viewerId: string;
  isAdmin: boolean;
  staff: Array<{ id: string; name: string }>;
}

export function ChatApp({ viewerId, isAdmin, staff }: Props) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const { data: channels, isPending } = useQuery({
    queryKey: CHANNELS_KEY,
    queryFn: () => clientFetch<{ data: ChatChannel[] }>('/chat/channels').then((r) => r.data),
  });

  // Default to the first channel once loaded
  useEffect(() => {
    if (!activeId && channels?.length) setActiveId(channels[0]!.id);
  }, [channels, activeId]);

  // Real-time updates
  useEffect(() => {
    const socket = getChatSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onCreated = (message: ChatMessage) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(messagesKey(message.channelId), (data) => {
        if (!data || data.pages[0]?.messages.some((m) => m.id === message.id)) return data;
        const [first, ...rest] = data.pages;
        return { ...data, pages: [{ ...first!, messages: [...first!.messages, message] }, ...rest] };
      });
      setTyping((t) => {
        const next = { ...t };
        delete next[`${message.channelId}:${message.author.id}`];
        return next;
      });
      if (message.channelId === activeRef.current && message.author.id !== viewerId) {
        void clientFetch(`/chat/channels/${message.channelId}/read`, { method: 'POST' }).catch(
          () => undefined,
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
      }
    };

    const onDeleted = ({ channelId, messageId }: { channelId: string; messageId: string }) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(messagesKey(channelId), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((p) => ({
                ...p,
                messages: p.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, deleted: true, body: null, attachment: null, ticket: null }
                    : m,
                ),
              })),
            }
          : data,
      );
    };

    const onChannelsChanged = () => {
      socket.emit('channels:sync');
      void queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
    };

    const onTyping = ({ channelId, user }: { channelId: string; user: { id: string; name: string } }) =>
      setTyping((t) => ({ ...t, [`${channelId}:${user.id}`]: { name: user.name, until: Date.now() + 4000 } }));

    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:created', onCreated);
    socket.on('message:deleted', onDeleted);
    socket.on('channels:changed', onChannelsChanged);
    socket.on('typing', onTyping);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:created', onCreated);
      socket.off('message:deleted', onDeleted);
      socket.off('channels:changed', onChannelsChanged);
      socket.off('typing', onTyping);
    };
  }, [queryClient, viewerId]);

  // Expire stale typing indicators
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((current) => {
        const now = Date.now();
        const entries = Object.entries(current).filter(([, v]) => v.until > now);
        return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const active = channels?.find((c) => c.id === activeId) ?? null;
  const typingNames = Object.entries(typing)
    .filter(([key]) => key.startsWith(`${activeId}:`))
    .map(([, v]) => v.name);

  return (
    <div className="-my-2 flex h-[calc(100vh-7.5rem)] flex-col gap-3 md:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Team chat</h1>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn('size-2 rounded-full', connected ? 'bg-green-500' : 'bg-muted-foreground/40')}
            aria-hidden="true"
          />
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <Card className="flex min-h-0 flex-1 overflow-hidden">
        {/* Channels */}
        <aside className="hidden w-56 shrink-0 flex-col border-r sm:flex" aria-label="Channels">
          <div className="flex items-center justify-between px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Channels
            </p>
            {isAdmin && <NewChannelDialog staff={staff} viewerId={viewerId} onCreated={setActiveId} />}
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {isPending ? (
              <Loader2 className="mx-auto mt-4 size-4 animate-spin text-muted-foreground" />
            ) : (
              channels?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  aria-current={c.id === activeId ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    c.id === activeId
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    c.unreadCount > 0 && c.id !== activeId && 'font-semibold text-foreground',
                  )}
                >
                  {c.isDefault ? (
                    <Hash className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Lock className="size-3.5 shrink-0" aria-label="Private" />
                  )}
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.unreadCount > 0 && c.id !== activeId && (
                    <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </nav>
        </aside>

        {/* Conversation */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Channel switcher on small screens */}
          {channels && channels.length > 0 && (
            <div className="border-b px-3 py-2 sm:hidden">
              <label htmlFor="channel-select" className="sr-only">
                Channel
              </label>
              <select
                id="channel-select"
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={activeId ?? ''}
                onChange={(e) => setActiveId(e.target.value)}
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                    {c.unreadCount ? ` (${c.unreadCount})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {active ? (
            <MessagePane
              key={active.id}
              channel={active}
              viewerId={viewerId}
              isAdmin={isAdmin}
              typingNames={typingNames}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessagesSquare className="size-8" aria-hidden="true" />
              <p className="text-sm">{isPending ? 'Loading…' : 'No channels yet.'}</p>
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
