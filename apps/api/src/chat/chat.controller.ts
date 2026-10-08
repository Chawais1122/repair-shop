import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { UserRole } from '@repair-shop/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AttachmentStorageService, MAX_ATTACHMENT_BYTES } from './attachment-storage.service';
import { ChatService } from './chat.service';
import {
  ChannelResponseDto,
  ChatMessageResponseDto,
  CreateChannelDto,
  FindMessagesQueryDto,
  SendMessageDto,
  UpdateChannelDto,
} from './dto/chat.dto';

class PhotoCaptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  caption?: string;
}

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly storage: AttachmentStorageService,
  ) {}

  @Get('channels')
  listChannels(@CurrentUser() user: AuthenticatedUser): Promise<ChannelResponseDto[]> {
    return this.chatService.listChannels(user);
  }

  @Post('channels')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChannelResponseDto> {
    return this.chatService.createChannel(dto, user.id);
  }

  @Patch('channels/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  updateChannel(@Param('id') id: string, @Body() dto: UpdateChannelDto): Promise<void> {
    return this.chatService.updateChannel(id, dto);
  }

  @Delete('channels/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteChannel(@Param('id') id: string): Promise<void> {
    return this.chatService.deleteChannel(id);
  }

  @Get('channels/:id/messages')
  listMessages(
    @Param('id') id: string,
    @Query() query: FindMessagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ messages: ChatMessageResponseDto[]; hasMore: boolean }> {
    return this.chatService.listMessages(id, user, query);
  }

  @Post('channels/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.sendMessage(id, user, dto);
  }

  @Post('channels/:id/photos')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    // Multer rejects oversized uploads before they are buffered in full
    FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 } }),
  )
  sendPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: PhotoCaptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.sendPhoto(id, user, file, dto.caption);
  }

  @Post('channels/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.chatService.markRead(id, user.id);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMessage(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.chatService.deleteMessage(id, user);
  }

  @Get('attachments/:messageId')
  async attachment(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const meta = await this.chatService.getAttachment(messageId, user);
    const { stream, size } = await this.storage.open(meta.path);
    res.set({
      'Content-Type': meta.mime,
      'Content-Length': String(size),
      'Content-Disposition': `inline; filename="${meta.name.replace(/["\r\n]/g, '')}"`,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      // The web app runs on a different port (same site), so relax Helmet's same-origin default
      'Cross-Origin-Resource-Policy': 'same-site',
    });
    return new StreamableFile(stream);
  }
}
