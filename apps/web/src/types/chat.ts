export interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  memberIds: string[];
  unreadCount: number;
  lastMessageAt: string | null;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  author: { id: string; name: string };
  body: string | null;
  ticket: { id: string; ticketNumber: string; status: string } | null;
  /** url is relative to the API base URL */
  attachment: { url: string; name: string; mime: string; size: number } | null;
  deleted: boolean;
  createdAt: string;
}
