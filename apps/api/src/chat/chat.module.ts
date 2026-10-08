import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TicketsModule } from '../tickets/tickets.module';
import { UsersModule } from '../users/users.module';
import { AttachmentStorageService } from './attachment-storage.service';
import { ChatEventsService } from './chat-events.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  // JwtModule without defaults: the gateway passes the secret explicitly when verifying
  imports: [UsersModule, TicketsModule, JwtModule.register({})],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatEventsService, AttachmentStorageService],
})
export class ChatModule {}
