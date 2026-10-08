import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@repair-shop/shared';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { ChatEventsService } from './chat-events.service';
import {
  ChannelResponseDto,
  ChatMessageResponseDto,
  CreateChannelDto,
  FindMessagesQueryDto,
  SendMessageDto,
  UpdateChannelDto,
} from './dto/chat.dto';

const MESSAGE_INCLUDE = {
  author: { select: { id: true, name: true } },
  ticket: { select: { id: true, ticketNumber: true, status: true } },
} as const;

type MessageRow = Prisma.ChatMessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

const DEFAULT_CHANNEL = 'general';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly ticketsService: TicketsService,
    private readonly storage: AttachmentStorageService,
    private readonly events: ChatEventsService,
  ) {}

  // ─── Channels ───────────────────────────────────────────────────────────────

  async listChannels(user: AuthenticatedUser): Promise<ChannelResponseDto[]> {
    await this.ensureDefaultChannel(user.id);

    const channels = await this.prisma.chatChannel.findMany({
      where: this.accessibleWhere(user.id),
      include: { members: { select: { userId: true, isMember: true, lastReadAt: true } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return Promise.all(
      channels.map(async (c) => {
        const readState = c.members.find((m) => m.userId === user.id);
        const [unreadCount, last] = await Promise.all([
          this.prisma.chatMessage.count({
            where: {
              channelId: c.id,
              deletedAt: null,
              authorId: { not: user.id },
              ...(readState && { createdAt: { gt: readState.lastReadAt } }),
            },
          }),
          this.prisma.chatMessage.findFirst({
            where: { channelId: c.id, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]);
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          isDefault: c.isDefault,
          memberIds: c.members.filter((m) => m.isMember).map((m) => m.userId),
          unreadCount,
          lastMessageAt: last?.createdAt ?? null,
        };
      }),
    );
  }

  /** Ids of every channel the user may read — used to join socket rooms. */
  async accessibleChannelIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.chatChannel.findMany({
      where: this.accessibleWhere(userId),
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async createChannel(dto: CreateChannelDto, adminId: string): Promise<ChannelResponseDto> {
    const existing = await this.prisma.chatChannel.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`#${dto.name} already exists`);

    const memberIds = dto.isDefault
      ? []
      : await this.validMembers([...(dto.memberIds ?? []), adminId]);
    const channel = await this.prisma.chatChannel.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        isDefault: dto.isDefault ?? false,
        createdById: adminId,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
    this.events.channelsChanged();
    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isDefault: channel.isDefault,
      memberIds,
      unreadCount: 0,
      lastMessageAt: null,
    };
  }

  async updateChannel(id: string, dto: UpdateChannelDto): Promise<void> {
    const channel = await this.prisma.chatChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException(`Channel ${id} not found`);
    if (dto.memberIds && channel.isDefault) {
      throw new BadRequestException('Everyone can already see this channel');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.description !== undefined) {
        await tx.chatChannel.update({
          where: { id },
          data: { description: dto.description || null },
        });
      }
      if (dto.memberIds) {
        const memberIds = await this.validMembers(dto.memberIds);
        if (memberIds.length === 0)
          throw new BadRequestException('A channel needs at least one member');
        // Keep rows (and read positions) for removed members, just revoke access
        await tx.chatChannelMember.updateMany({
          where: { channelId: id, userId: { notIn: memberIds } },
          data: { isMember: false },
        });
        for (const userId of memberIds) {
          await tx.chatChannelMember.upsert({
            where: { channelId_userId: { channelId: id, userId } },
            create: { channelId: id, userId },
            update: { isMember: true },
          });
        }
      }
    });
    this.events.channelsChanged();
  }

  async deleteChannel(id: string): Promise<void> {
    const channel = await this.prisma.chatChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException(`Channel ${id} not found`);
    if (channel.isDefault) {
      const defaults = await this.prisma.chatChannel.count({ where: { isDefault: true } });
      if (defaults <= 1)
        throw new BadRequestException('The last company-wide channel cannot be deleted');
    }

    const attachments = await this.prisma.chatMessage.findMany({
      where: { channelId: id, attachmentPath: { not: null } },
      select: { attachmentPath: true },
    });
    await this.prisma.chatChannel.delete({ where: { id } });
    await Promise.all(attachments.map((a) => this.storage.remove(a.attachmentPath!)));
    this.events.channelsChanged();
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  async listMessages(
    channelId: string,
    user: AuthenticatedUser,
    query: FindMessagesQueryDto,
  ): Promise<{ messages: ChatMessageResponseDto[]; hasMore: boolean }> {
    await this.assertAccess(channelId, user.id);
    const limit = query.limit ?? 50;

    let cursorDate: Date | undefined;
    if (query.before) {
      const cursor = await this.prisma.chatMessage.findFirst({
        where: { id: query.before, channelId },
        select: { createdAt: true },
      });
      if (!cursor) throw new BadRequestException('Unknown message cursor');
      cursorDate = cursor.createdAt;
    }

    const rows = await this.prisma.chatMessage.findMany({
      where: { channelId, ...(cursorDate && { createdAt: { lt: cursorDate } }) },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    return {
      messages: rows
        .slice(0, limit)
        .reverse()
        .map((m) => this.toMessageDto(m)),
      hasMore,
    };
  }

  async sendMessage(
    channelId: string,
    user: AuthenticatedUser,
    dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    await this.assertAccess(channelId, user.id);
    if (dto.ticketId) await this.ticketsService.findOne(dto.ticketId);

    const message = await this.prisma.chatMessage.create({
      data: {
        channelId,
        authorId: user.id,
        body: dto.body?.trim() || null,
        ticketId: dto.ticketId ?? null,
      },
      include: MESSAGE_INCLUDE,
    });
    return this.publish(message, user.id);
  }

  async sendPhoto(
    channelId: string,
    user: AuthenticatedUser,
    file: { buffer: Buffer; originalname: string; size: number } | undefined,
    caption?: string,
  ): Promise<ChatMessageResponseDto> {
    if (!file) throw new BadRequestException('Attach a photo to upload');
    await this.assertAccess(channelId, user.id);
    if (caption && caption.length > 4000) throw new BadRequestException('Caption is too long');

    const stored = await this.storage.saveImage(file);
    try {
      const message = await this.prisma.chatMessage.create({
        data: {
          channelId,
          authorId: user.id,
          body: caption?.trim() || null,
          attachmentPath: stored.path,
          attachmentName: stored.name,
          attachmentMime: stored.mime,
          attachmentSize: stored.size,
        },
        include: MESSAGE_INCLUDE,
      });
      return this.publish(message, user.id);
    } catch (err) {
      await this.storage.remove(stored.path);
      throw err;
    }
  }

  async getAttachment(
    messageId: string,
    user: AuthenticatedUser,
  ): Promise<{ path: string; mime: string; name: string }> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        channelId: true,
        attachmentPath: true,
        attachmentMime: true,
        attachmentName: true,
        deletedAt: true,
      },
    });
    if (!message?.attachmentPath || message.deletedAt)
      throw new NotFoundException('Attachment not found');
    await this.assertAccess(message.channelId, user.id);
    return {
      path: message.attachmentPath,
      mime: message.attachmentMime ?? 'application/octet-stream',
      name: message.attachmentName ?? 'photo',
    };
  }

  async deleteMessage(messageId: string, user: AuthenticatedUser): Promise<void> {
    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.authorId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), body: null, ticketId: null, attachmentPath: null },
    });
    if (message.attachmentPath) await this.storage.remove(message.attachmentPath);
    this.events.messageDeleted(message.channelId, messageId);
  }

  async markRead(channelId: string, userId: string): Promise<void> {
    await this.assertAccess(channelId, userId);
    await this.prisma.chatChannelMember.upsert({
      where: { channelId_userId: { channelId, userId } },
      create: { channelId, userId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
  }

  /** Throws unless the user can read the channel. Also used by the socket gateway. */
  async assertAccess(channelId: string, userId: string): Promise<void> {
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: {
        isDefault: true,
        members: { where: { userId, isMember: true }, select: { userId: true } },
      },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (!channel.isDefault && channel.members.length === 0) {
      throw new ForbiddenException('You are not a member of this channel');
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private accessibleWhere(userId: string): Prisma.ChatChannelWhereInput {
    return { OR: [{ isDefault: true }, { members: { some: { userId, isMember: true } } }] };
  }

  private async ensureDefaultChannel(userId: string): Promise<void> {
    const count = await this.prisma.chatChannel.count({ where: { isDefault: true } });
    if (count > 0) return;
    await this.prisma.chatChannel.upsert({
      where: { name: DEFAULT_CHANNEL },
      create: {
        name: DEFAULT_CHANNEL,
        description: 'Shop-wide announcements and chatter',
        isDefault: true,
        createdById: userId,
      },
      update: { isDefault: true },
    });
  }

  private async validMembers(ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)];
    for (const id of unique) {
      const member = await this.usersService.findOne(id);
      if (!member.isActive) throw new BadRequestException(`${member.name} is deactivated`);
    }
    return unique;
  }

  private async publish(message: MessageRow, authorId: string): Promise<ChatMessageResponseDto> {
    const dto = this.toMessageDto(message);
    // Sending a message means you've read the channel up to it
    await this.prisma.chatChannelMember.upsert({
      where: { channelId_userId: { channelId: message.channelId, userId: authorId } },
      create: { channelId: message.channelId, userId: authorId, lastReadAt: message.createdAt },
      update: { lastReadAt: message.createdAt },
    });
    this.events.messageCreated(dto);
    return dto;
  }

  private toMessageDto(m: MessageRow): ChatMessageResponseDto {
    return {
      id: m.id,
      channelId: m.channelId,
      author: m.author,
      body: m.deletedAt ? null : m.body,
      ticket: m.deletedAt ? null : m.ticket,
      attachment:
        m.attachmentPath && !m.deletedAt
          ? {
              url: `/chat/attachments/${m.id}`,
              name: m.attachmentName ?? 'photo',
              mime: m.attachmentMime ?? 'image/jpeg',
              size: m.attachmentSize ?? 0,
            }
          : null,
      deleted: m.deletedAt !== null,
      createdAt: m.createdAt,
    };
  }
}
