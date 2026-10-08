'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/lib/api/client';
import { getChatSocket } from '@/lib/chat-socket';
import type { ChatChannel } from '@/types/chat';
import { CHANNELS_KEY } from './query-keys';

/** Total unread chat messages, shown next to "Team chat" in the sidebar. */
export function ChatUnreadBadge() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: CHANNELS_KEY,
    queryFn: () => clientFetch<{ data: ChatChannel[] }>('/chat/channels').then((r) => r.data),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const socket = getChatSocket();
    const refresh = () => void queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
    socket.on('message:created', refresh);
    return () => {
      socket.off('message:created', refresh);
    };
  }, [queryClient]);

  const total = (data ?? []).reduce((n, c) => n + c.unreadCount, 0);
  if (total === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
      <span className="sr-only">, unread messages: </span>
      {total > 99 ? '99+' : total}
    </span>
  );
}
