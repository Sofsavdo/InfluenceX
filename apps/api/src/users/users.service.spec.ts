import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { SubscriptionPlan } from '@influencex/shared';

/**
 * users.service.ts - PRD "Subscription Plans" (updateSubscriptionPlan) va
 * "Featured Placement" (promoteProfile) uchun testlar.
 */
describe('UsersService', () => {
  let prisma: any;
  let service: UsersService;

  const USER_ID = 'user-1';

  beforeEach(() => {
    prisma = {
      businessProfile: { findUnique: jest.fn(), update: jest.fn() },
      creatorProfile: { findUnique: jest.fn(), update: jest.fn() },
    };
    service = new UsersService(prisma);
  });

  describe('updateSubscriptionPlan', () => {
    it('biznes profili bo\'lmasa ForbiddenException tashlaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.updateSubscriptionPlan(USER_ID, { plan: SubscriptionPlan.GROWTH }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('to\'g\'ri holatda subscriptionPlan\'ni yangilaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({ id: 'business-1' });
      prisma.businessProfile.update.mockResolvedValue({ id: 'business-1', subscriptionPlan: SubscriptionPlan.GROWTH });

      const result = await service.updateSubscriptionPlan(USER_ID, { plan: SubscriptionPlan.GROWTH });
      expect(result.subscriptionPlan).toBe(SubscriptionPlan.GROWTH);
      expect(prisma.businessProfile.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { subscriptionPlan: SubscriptionPlan.GROWTH },
      });
    });
  });

  describe('promoteProfile', () => {
    it('kreator profili bo\'lmasa ForbiddenException tashlaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      await expect(service.promoteProfile(USER_ID, 7)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('to\'g\'ri holatda isFeatured=true va featuredUntil\'ni kelajakka o\'rnatadi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'creator-1' });
      prisma.creatorProfile.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'creator-1', ...data }),
      );

      const before = Date.now();
      const result = await service.promoteProfile(USER_ID, 3);

      expect(result.isFeatured).toBe(true);
      expect(result.featuredUntil.getTime()).toBeGreaterThan(before);
      expect(result.featuredUntil.getTime()).toBeLessThanOrEqual(before + 3 * 24 * 60 * 60 * 1000 + 1000);
    });
  });
});
