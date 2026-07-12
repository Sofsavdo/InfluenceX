import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@influencex/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * TelegramAuthGuard'dan KEYIN ishlatiladi (request.user allaqachon to'ldirilgan bo'lishi kerak).
 * Moderator/Admin talab qilinadigan endpoint'lar uchun (masalan escrow nizolarini hal qilish,
 * verifikatsiyani tasdiqlash) — PRD v1 §Moderator/Admin rollariga mos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Bu amal uchun quyidagi rol(lar) kerak: ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}
