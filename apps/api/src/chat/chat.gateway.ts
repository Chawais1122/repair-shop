import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthenticatedUser, JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { channelRoom, ChatEventsService } from './chat-events.service';
import { ChatService } from './chat.service';

interface SocketUser extends AuthenticatedUser {
  name: string;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/**
 * Real-time delivery for team chat. Clients authenticate with the same httpOnly
 * accessToken cookie as the REST API and only join rooms for channels they can read.
 */
@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
    private readonly events: ChatEventsService,
  ) {}

  afterInit(server: Server): void {
    this.events.attach(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = readCookie(client.handshake.headers.cookie, 'accessToken');
      if (!token) throw new Error('missing token');
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      const user = await this.usersService.findOne(payload.sub);
      if (!user.isActive) throw new Error('inactive user');

      const socketUser: SocketUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
      client.data.user = socketUser;
      await this.joinRooms(client, user.id);
    } catch (err) {
      this.logger.debug(`Rejected chat socket: ${err instanceof Error ? err.message : err}`);
      client.disconnect(true);
    }
  }

  /** Re-sync room membership after channels change. */
  @SubscribeMessage('channels:sync')
  async resync(@ConnectedSocket() client: Socket): Promise<void> {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return;
    for (const room of client.rooms) {
      if (room.startsWith('channel:')) await client.leave(room);
    }
    await this.joinRooms(client, user.id);
  }

  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: unknown },
  ): Promise<void> {
    const user = client.data.user as SocketUser | undefined;
    if (!user || typeof body?.channelId !== 'string') return;
    const room = channelRoom(body.channelId);
    // Only relay for rooms the socket was allowed to join
    if (!client.rooms.has(room)) return;
    client.to(room).emit('typing', {
      channelId: body.channelId,
      user: { id: user.id, name: user.name },
    });
  }

  private async joinRooms(client: Socket, userId: string): Promise<void> {
    const ids = await this.chatService.accessibleChannelIds(userId);
    await client.join(ids.map(channelRoom));
  }
}
