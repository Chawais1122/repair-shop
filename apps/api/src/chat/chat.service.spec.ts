import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { ChatEventsService } from './chat-events.service';
import { ChatService } from './chat.service';

const tech = { id: 'tech', email: 't@x', role: UserRole.TECHNICIAN };
const admin = { id: 'admin', email: 'a@x', role: UserRole.ADMIN };
const now = new Date('2030-01-01T10:00:00Z');

const messageRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  channelId: 'c1',
  authorId: 'tech',
  body: 'Screen in stock?',
  ticketId: null,
  attachmentPath: null,
  attachmentName: null,
  attachmentMime: null,
  attachmentSize: null,
  deletedAt: null,
  createdAt: now,
  author: { id: 'tech', name: 'Tech' },
  ticket: null,
  ...overrides,
});

describe('ChatService', () => {
  let service: ChatService;
  let events: { messageCreated: jest.Mock; messageDeleted: jest.Mock; channelsChanged: jest.Mock };
  let storage: { saveImage: jest.Mock; remove: jest.Mock };
  let prisma: {
    chatChannel: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
    };
    chatMessage: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    chatChannelMember: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      chatChannel: {
        // Private channel where tech is a member
        findUnique: jest
          .fn()
          .mockResolvedValue({ isDefault: false, members: [{ userId: 'tech' }] }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c2', ...data })),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(messageRow()),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      chatChannelMember: { upsert: jest.fn() },
    };
    events = { messageCreated: jest.fn(), messageDeleted: jest.fn(), channelsChanged: jest.fn() };
    storage = {
      saveImage: jest
        .fn()
        .mockResolvedValue({ path: 'a.png', mime: 'image/png', size: 10, name: 'a.png' }),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'x', name: 'X', isActive: true }),
          },
        },
        {
          provide: TicketsService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 't1' }) },
        },
        { provide: AttachmentStorageService, useValue: storage },
        { provide: ChatEventsService, useValue: events },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  describe('access', () => {
    it('blocks non-members from private channels', async () => {
      prisma.chatChannel.findUnique.mockResolvedValue({ isDefault: false, members: [] });
      await expect(service.listMessages('c1', tech, {})).rejects.toThrow(ForbiddenException);
    });

    it('lets everyone into default channels', async () => {
      prisma.chatChannel.findUnique.mockResolvedValue({ isDefault: true, members: [] });
      await expect(service.listMessages('c1', tech, {})).resolves.toEqual({
        messages: [],
        hasMore: false,
      });
    });

    it('404s for unknown channels', async () => {
      prisma.chatChannel.findUnique.mockResolvedValue(null);
      await expect(service.markRead('nope', 'tech')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    it('stores the message, marks the channel read for the sender and broadcasts it', async () => {
      const result = await service.sendMessage('c1', tech, { body: '  Screen in stock?  ' });
      expect(prisma.chatMessage.create.mock.calls[0][0].data.body).toBe('Screen in stock?');
      expect(prisma.chatChannelMember.upsert).toHaveBeenCalled();
      expect(events.messageCreated).toHaveBeenCalledWith(result);
    });

    it('sends photos with a protected attachment URL and cleans up on failure', async () => {
      prisma.chatMessage.create.mockResolvedValueOnce(
        messageRow({
          attachmentPath: 'a.png',
          attachmentMime: 'image/png',
          attachmentName: 'a.png',
        }),
      );
      const ok = await service.sendPhoto('c1', tech, {
        buffer: Buffer.from([]),
        originalname: 'a.png',
        size: 10,
      });
      expect(ok.attachment?.url).toBe('/chat/attachments/m1');

      prisma.chatMessage.create.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.sendPhoto('c1', tech, { buffer: Buffer.from([]), originalname: 'a.png', size: 10 }),
      ).rejects.toThrow('db down');
      expect(storage.remove).toHaveBeenCalledWith('a.png');
    });

    it('requires a file for photo messages', async () => {
      await expect(service.sendPhoto('c1', tech, undefined)).rejects.toThrow(BadRequestException);
    });
  });

  describe('listMessages', () => {
    it('returns oldest-first with a hasMore flag', async () => {
      prisma.chatMessage.findMany.mockResolvedValue([
        messageRow({ id: 'm3' }),
        messageRow({ id: 'm2' }),
        messageRow({ id: 'm1' }),
      ]);
      const result = await service.listMessages('c1', tech, { limit: 2 });
      expect(result.hasMore).toBe(true);
      expect(result.messages.map((m) => m.id)).toEqual(['m2', 'm3']);
    });

    it('hides the content of deleted messages', async () => {
      prisma.chatMessage.findMany.mockResolvedValue([
        messageRow({ deletedAt: now, body: 'secret' }),
      ]);
      const { messages } = await service.listMessages('c1', tech, {});
      expect(messages[0]).toMatchObject({ deleted: true, body: null });
    });
  });

  describe('deleteMessage', () => {
    it("forbids deleting other people's messages", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue(messageRow({ authorId: 'desk' }));
      await expect(service.deleteMessage('m1', tech)).rejects.toThrow(ForbiddenException);
    });

    it('lets admins delete and removes the photo file', async () => {
      prisma.chatMessage.findUnique.mockResolvedValue(
        messageRow({ authorId: 'desk', attachmentPath: 'a.png' }),
      );
      await service.deleteMessage('m1', admin);
      expect(storage.remove).toHaveBeenCalledWith('a.png');
      expect(events.messageDeleted).toHaveBeenCalledWith('c1', 'm1');
    });
  });

  describe('channels', () => {
    it('rejects duplicate channel names', async () => {
      prisma.chatChannel.findUnique.mockResolvedValue({ id: 'c1' });
      await expect(service.createChannel({ name: 'bench' }, 'admin')).rejects.toThrow(
        ConflictException,
      );
    });

    it('adds the creator to private channels', async () => {
      prisma.chatChannel.findUnique.mockResolvedValue(null);
      const channel = await service.createChannel({ name: 'bench', memberIds: ['tech'] }, 'admin');
      expect(channel.memberIds).toEqual(['tech', 'admin']);
      expect(events.channelsChanged).toHaveBeenCalled();
    });

    it('keeps at least one company-wide channel', async () => {
      prisma.chatChannel.findUnique.mockResolvedValue({ id: 'c1', isDefault: true });
      prisma.chatChannel.count.mockResolvedValue(1);
      await expect(service.deleteChannel('c1')).rejects.toThrow(BadRequestException);
    });

    it('creates #general on first use', async () => {
      prisma.chatChannel.count.mockResolvedValue(0);
      await service.listChannels(tech);
      expect(prisma.chatChannel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'general' } }),
      );
    });
  });
});
