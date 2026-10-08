import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/, {
    message: 'Channel names use 2–40 lowercase letters, numbers and dashes',
  })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  /** Open to every employee; otherwise only memberIds (plus the creator). */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  memberIds?: string[];
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  /** Replaces the member list of a private channel. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  memberIds?: string[];
}

export class SendMessageDto {
  @ValidateIf((o: SendMessageDto) => !o.ticketId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body?: string;

  /** Share a ticket into the conversation. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ticketId?: string;
}

export class FindMessagesQueryDto {
  /** Message id to page backwards from (exclusive). */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class ChannelResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  isDefault!: boolean;
  memberIds!: string[];
  unreadCount!: number;
  lastMessageAt!: Date | null;
}

export class ChatMessageResponseDto {
  id!: string;
  channelId!: string;
  author!: { id: string; name: string };
  body!: string | null;
  ticket!: { id: string; ticketNumber: string; status: string } | null;
  attachment!: { url: string; name: string; mime: string; size: number } | null;
  deleted!: boolean;
  createdAt!: Date;
}
