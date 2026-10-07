import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repair-shop/shared';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

function makeContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(
      guard.canActivate(makeContext({ id: '1', email: 'a@b.com', role: UserRole.STAFF })),
    ).toBe(true);
  });

  it('allows access when the user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(
      guard.canActivate(makeContext({ id: '1', email: 'a@b.com', role: UserRole.ADMIN })),
    ).toBe(true);
  });

  it('denies access when the user lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(
      guard.canActivate(makeContext({ id: '1', email: 'a@b.com', role: UserRole.STAFF })),
    ).toBe(false);
  });

  it('allows access when the user has one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.STAFF]);
    expect(
      guard.canActivate(makeContext({ id: '1', email: 'a@b.com', role: UserRole.STAFF })),
    ).toBe(true);
  });

  it('allows TECHNICIAN when TECHNICIAN is in the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TECHNICIAN]);
    expect(
      guard.canActivate(makeContext({ id: '1', email: 'a@b.com', role: UserRole.TECHNICIAN })),
    ).toBe(true);
  });

  it('denies access when request.user is not set (unauthenticated on a protected route)', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });
});
