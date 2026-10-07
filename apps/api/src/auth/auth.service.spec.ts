import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@repair-shop/shared';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const PASSWORD = 'Password123!';
const mockUser = {
  id: 'user-id-1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'ADMIN' as const,
  isActive: true,
  passwordHash: bcrypt.hashSync(PASSWORD, 10),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret-at-least-32-chars!!!!!'),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('returns user data on valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({ email: 'admin@test.com', password: PASSWORD });

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: UserRole.ADMIN,
      });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@test.com', password: PASSWORD })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'admin@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login({ email: 'admin@test.com', password: PASSWORD })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createAccessToken', () => {
    it('signs a JWT with the correct payload', () => {
      service.createAccessToken('id1', 'test@test.com', UserRole.STAFF);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'id1', email: 'test@test.com', role: UserRole.STAFF },
        expect.objectContaining({ secret: expect.any(String), expiresIn: expect.any(String) }),
      );
    });
  });

  describe('createRefreshToken', () => {
    it('signs a JWT with the correct payload and refresh secret', () => {
      service.createRefreshToken('id1', 'test@test.com', UserRole.TECHNICIAN);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'id1', email: 'test@test.com', role: UserRole.TECHNICIAN },
        expect.objectContaining({ secret: expect.any(String) }),
      );
    });
  });

  describe('refresh', () => {
    it('returns a new access token on a valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-id-1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as never);
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh('valid-refresh-token');
      expect(result).toBe('mock-jwt-token');
    });

    it('throws UnauthorizedException when the token signature is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the user no longer exists', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-id-1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as never);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the user is inactive', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-id-1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as never);
      usersService.findById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
