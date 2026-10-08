import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessagePane } from './message-pane';
import { clientFetch } from '@/lib/api/client';
import type { ChatChannel, ChatMessage } from '@/types/chat';

const emit = jest.fn();
jest.mock('@/lib/chat-socket', () => ({
  apiUrl: (p: string) => `http://api${p}`,
  getChatSocket: () => ({ emit }),
}));
jest.mock('@/lib/api/client', () => ({
  clientFetch: jest.fn(),
  clientUpload: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>;

const channel: ChatChannel = {
  id: 'c1',
  name: 'general',
  description: 'Shop-wide',
  isDefault: true,
  memberIds: [],
  unreadCount: 0,
  lastMessageAt: null,
};

const msg = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: 'm1',
  channelId: 'c1',
  author: { id: 'desk', name: 'Desk' },
  body: 'Customer is here for TKT-0001',
  ticket: null,
  attachment: null,
  deleted: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

function renderPane() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MessagePane channel={channel} viewerId="tech" isAdmin={false} typingNames={['Desk']} />
    </QueryClientProvider>,
  );
}

describe('MessagePane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockImplementation((path: string) => {
      if (path.includes('/messages?')) {
        return Promise.resolve({
          data: {
            hasMore: false,
            messages: [
              msg({}),
              msg({
                id: 'm2',
                author: { id: 'tech', name: 'Tech' },
                body: null,
                attachment: { url: '/chat/attachments/m2', name: 'cracked.jpg', mime: 'image/jpeg', size: 1 },
              }),
              msg({ id: 'm3', deleted: true, body: null }),
            ],
          },
        });
      }
      return Promise.resolve(undefined);
    });
  });

  it('renders messages, photos, deletions and who is typing', async () => {
    renderPane();
    expect(await screen.findByText('Customer is here for TKT-0001')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'cracked.jpg' })).toHaveAttribute(
      'src',
      'http://api/chat/attachments/m2',
    );
    expect(screen.getByText('Message deleted')).toBeInTheDocument();
    expect(screen.getByText('Desk is typing…')).toBeInTheDocument();
  });

  it('only offers delete on your own messages', async () => {
    renderPane();
    await screen.findByText('Customer is here for TKT-0001');
    expect(screen.getAllByRole('button', { name: 'Delete message' })).toHaveLength(1);
  });

  it('sends on Enter and announces typing', async () => {
    const user = userEvent.setup();
    renderPane();
    await screen.findByText('Customer is here for TKT-0001');

    await user.type(screen.getByLabelText('Message #general'), 'On it{Enter}');

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/chat/channels/c1/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'On it' }),
      }),
    );
    expect(emit).toHaveBeenCalledWith('typing', { channelId: 'c1' });
  });

  it('marks the channel read when opened', async () => {
    renderPane();
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/chat/channels/c1/read', { method: 'POST' }),
    );
  });
});
