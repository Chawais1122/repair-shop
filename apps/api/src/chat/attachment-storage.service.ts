import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve, sep } from 'path';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Leading bytes of each allowed image format, so a renamed file can't pose as an image. */
const SIGNATURES: Array<{ mime: string; test: (b: Buffer) => boolean }> = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: 'image/gif', test: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  {
    mime: 'image/webp',
    test: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export interface StoredAttachment {
  path: string;
  mime: string;
  size: number;
  name: string;
}

@Injectable()
export class AttachmentStorageService {
  private readonly logger = new Logger(AttachmentStorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    const dir = config.get<string>('UPLOAD_DIR', './uploads');
    this.root = resolve(isAbsolute(dir) ? dir : join(process.cwd(), dir), 'chat');
  }

  /** Validates an uploaded image by content (not just its declared type) and writes it to disk. */
  async saveImage(file: {
    buffer: Buffer;
    originalname: string;
    size: number;
  }): Promise<StoredAttachment> {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('Photos must be 5 MB or smaller');
    }
    const detected = SIGNATURES.find((s) => s.test(file.buffer))?.mime;
    if (!detected)
      throw new BadRequestException('Only JPEG, PNG, WebP or GIF images can be shared');

    const fileName = `${randomUUID()}.${ALLOWED_TYPES[detected]}`;
    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, fileName), file.buffer);

    return {
      path: fileName,
      mime: detected,
      size: file.size,
      // Keep the display name short and free of path components
      name: file.originalname.replace(/[\\/]/g, '_').slice(0, 120) || fileName,
    };
  }

  async open(path: string): Promise<{ stream: ReadStream; size: number }> {
    const full = this.resolveSafe(path);
    try {
      const info = await stat(full);
      return { stream: createReadStream(full), size: info.size };
    } catch {
      throw new NotFoundException('Attachment not found');
    }
  }

  async remove(path: string): Promise<void> {
    try {
      await unlink(this.resolveSafe(path));
    } catch (err) {
      this.logger.warn(
        `Could not delete attachment ${path}`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /** Stored names are generated UUIDs; refuse anything that would escape the upload folder. */
  private resolveSafe(path: string): string {
    const full = resolve(this.root, path);
    if (!full.startsWith(this.root + sep)) throw new NotFoundException('Attachment not found');
    return full;
  }
}
