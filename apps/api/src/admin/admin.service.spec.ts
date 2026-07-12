import { AdminService } from './admin.service';
import { CollaborationModel, EscrowStatus } from '@influencex/shared';

/**
 * admin.service.ts#revenueReport() - PRD Admin Panel "Revenue Reports". Tekshiradi:
 * (1) faqat RELEASED escrow va paidAt bor konversiyalar hisoblanadi (hali yakunlanmagan
 * pul harakatlari kiritilmaydi), (2) totalRevenue - bu platformFee yig'indisi (InfluenceX
 * komissiyasi), totalGrossVolume esa amount yig'indisi (yalpi tranzaksiya hajmi) - ikkalasi
 * har xil narsa va aralashtirilmasligi kerak.
 */
describe('AdminService#revenueReport', () => {
  let prisma: any;
  let fraudDetection: any;
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      escrow: { findMany: jest.fn() },
      conversion: { findMany: jest.fn() },
    };
    fraudDetection = {};
    service = new AdminService(prisma, fraudDetection);
  });

  it('faqat RELEASED escrow va to\'langan konversiyalarni hisoblaydi, model bo\'yicha ajratadi', async () => {
    prisma.escrow.findMany.mockResolvedValue([
      {
        platformFee: 15000,
        amount: 150000,
        updatedAt: new Date('2026-06-15'),
        application: { campaign: { title: 'Kampaniya A', collaborationModel: CollaborationModel.FIXED } },
      },
      {
        platformFee: 6000,
        amount: 60000,
        updatedAt: new Date('2026-07-02'),
        application: { campaign: { title: 'Kampaniya B', collaborationModel: CollaborationModel.BARTER } },
      },
    ]);
    prisma.conversion.findMany.mockResolvedValue([
      {
        platformFee: 1500,
        amount: 10000,
        paidAt: new Date('2026-07-05'),
        application: { campaign: { title: 'Kampaniya C', collaborationModel: CollaborationModel.CPA } },
      },
    ]);

    const result = await service.revenueReport();

    expect(result.totalRevenue).toBe(22500); // 15000 + 6000 + 1500
    expect(result.totalGrossVolume).toBe(220000); // 150000 + 60000 + 10000
    expect(result.revenueByModel[CollaborationModel.FIXED]).toBe(15000);
    expect(result.revenueByModel[CollaborationModel.BARTER]).toBe(6000);
    expect(result.revenueByModel[CollaborationModel.CPA]).toBe(1500);
    expect(result.revenueByModel[CollaborationModel.HYBRID]).toBe(0);
    expect(result.monthlyRevenue['2026-06']).toBe(15000);
    expect(result.monthlyRevenue['2026-07']).toBe(7500); // 6000 + 1500
    expect(result.transactions).toHaveLength(3);
    // eng yangi tranzaksiya birinchi
    expect(result.transactions[0].campaignTitle).toBe('Kampaniya C');
  });

  it('escrow/konversiya bo\'lmasa nol qiymatlar qaytaradi', async () => {
    prisma.escrow.findMany.mockResolvedValue([]);
    prisma.conversion.findMany.mockResolvedValue([]);

    const result = await service.revenueReport();

    expect(result.totalRevenue).toBe(0);
    expect(result.totalGrossVolume).toBe(0);
    expect(result.transactions).toEqual([]);
  });

  it('escrow.findMany faqat RELEASED holatini so\'raydi', async () => {
    prisma.escrow.findMany.mockResolvedValue([]);
    prisma.conversion.findMany.mockResolvedValue([]);

    await service.revenueReport();

    expect(prisma.escrow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: EscrowStatus.RELEASED } }),
    );
  });
});
