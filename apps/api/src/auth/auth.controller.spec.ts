import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@repair-shop/shared';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

const mockUser = {
  id: 'user-id-1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: UserRole.ADMIN,
};

function mockRes(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
  return { cookie: jest.fn(), clearCookie: jest.fn() };
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            createAccessToken: jest.fn().mockReturnValue('access-token'),
            createRefreshToken: jest.fn().mockReturnValue('refresh-token'),
            refresh: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    it('sets both cookies and returns user on success', async () => {
      authService.login.mockResolvedValue(mockUser);
      const res = mockRes();

      const result = await controller.login(
        { email: 'admin@test.com', password: 'Password123!' },
        res as unknown as Response,
      );

      expect(result).toEqual(mockUser);
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.any(Object));
    });

    it('propagates UnauthorizedException from the service', async () => {
      authService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(
        controller.login(
          { email: 'x@x.com', password: 'wrongpass' },
          mockRes() as unknown as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('sets a new accessToken cookie on a valid refresh token', async () => {
      authService.refresh.mockResolvedValue('new-access-token');
      const req = { cookies: { refreshToken: 'valid-refresh' } } as unknown as Request;
      const res = mockRes();

      await controller.refresh(req, res as unknown as Response);

      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh');
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token',
        expect.any(Object),
      );
    });

    it('throws UnauthorizedException when no refresh token cookie is present', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = mockRes();

      await expect(controller.refresh(req, res as unknown as Response)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('clears both auth cookies', () => {
      const res = mockRes();
      controller.logout(res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ path: expect.any(String) }),
      );
    });
  });

  describe('me', () => {
    it('returns the authenticated user from the decorator', () => {
      const user = { id: 'u1', email: 'staff@test.com', role: UserRole.STAFF };
      expect(controller.me(user)).toEqual(user);
    });
  });
});
