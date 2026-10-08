import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { ChatMessageResponseDto } from './dto/chat.dto';

export const channelRoom = (channelId: string): string => `channel:${channelId}`;

/**
 * Publishes chat events to connected clients. The gateway attaches the socket server on
 * startup; until then (and in unit tests) publishing is a no-op.
 */
@Injectable()
export class ChatEventsService {
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  messageCreated(message: ChatMessageResponseDto): void {
    this.server?.to(channelRoom(message.channelId)).emit('message:created', message);
  }

  messageDeleted(channelId: string, messageId: string): void {
    this.server?.to(channelRoom(channelId)).emit('message:deleted', { channelId, messageId });
  }

  /** Channel list or membership changed — clients refetch and rejoin rooms. */
  channelsChanged(): void {
    this.server?.emit('channels:changed');
  }
}
