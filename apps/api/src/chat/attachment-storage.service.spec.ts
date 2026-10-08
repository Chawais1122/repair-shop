import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AttachmentStorageService } from './attachment-storage.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('AttachmentStorageService', () => {
  let dir: string;
  let storage: AttachmentStorageService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'chat-uploads-'));
    storage = new AttachmentStorageService({
      get: () => dir,
    } as unknown as ConfigService);
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('stores real images under a generated name and sanitises the display name', async () => {
    const saved = await storage.saveImage({
      buffer: PNG,
      originalname: '../../etc/photo.png',
      size: PNG.length,
    });
    expect(saved.mime).toBe('image/png');
    expect(saved.path).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(saved.name).not.toContain('/');
    expect(await readdir(join(dir, 'chat'))).toEqual([saved.path]);
  });

  it('rejects files that are not images, whatever their name says', async () => {
    await expect(
      storage.saveImage({ buffer: Buffer.from('<script>'), originalname: 'x.png', size: 8 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects files over 5 MB', async () => {
    await expect(
      storage.saveImage({ buffer: PNG, originalname: 'x.png', size: 6 * 1024 * 1024 }),
    ).rejects.toThrow('5 MB');
  });

  it('refuses paths that escape the upload folder', async () => {
    await expect(storage.open('../../secret.txt')).rejects.toThrow('not found');
  });
});
