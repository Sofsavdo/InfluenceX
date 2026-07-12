import {
  UserRole,
  CreatorTier,
  Platform,
  CollaborationModel,
  ContentType,
  CampaignStatus,
  ApplicationStatus,
  EscrowStatus,
  VerificationStatus,
  Language,
  ConversionType,
  ConversionStatus,
  ConversionSource,
  SubscriptionPlan,
} from './enums';

export interface CreatorRequirement {
  minFollowers?: number;
  maxFollowers?: number;
  platforms?: Platform[];
  categories?: string[];
  countries?: string[];
  languages?: Language[];
}

export interface CampaignDto {
  id: string;
  businessId: string;
  title: string;
  description: string;
  productOrService: string;
  objective: string;
  contentType: ContentType;
  collaborationModel: CollaborationModel;
  budget: number;
  currency: 'UZS' | 'USD';
  creatorsCount: number;
  deadline: string; // ISO date
  requirements: CreatorRequirement;
  status: CampaignStatus;
  cpaRate?: number | null;
  landingUrl?: string | null;
  // PRD "Featured Placement" - 2026-07-11 qo'shildi.
  isFeatured?: boolean;
  featuredUntil?: string | null;
  createdAt: string;
}

export interface CreatorProfileDto {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  country?: string;
  city?: string;
  languages: Language[];
  categories: string[];
  socialLinks: Partial<Record<Platform, string>>;
  followers: number;
  avgViews: number;
  engagementRate: number;
  tier: CreatorTier;
  rating: number; // 0-5
  creatorScore: number; // 0-100
  verificationStatus: VerificationStatus;
  // PRD "Featured Placement": "Creators can promote profiles" - 2026-07-11 qo'shildi.
  isFeatured?: boolean;
  featuredUntil?: string | null;
}

export interface BusinessProfileDto {
  id: string;
  userId: string;
  companyName: string;
  logoUrl?: string;
  description?: string;
  industry?: string;
  website?: string;
  contactPerson?: string;
  businessScore: number; // 0-100
  verificationStatus: VerificationStatus;
  // PRD "Subscription Plans" - 2026-07-11 qo'shildi.
  subscriptionPlan?: SubscriptionPlan;
}

export interface ApplicationDto {
  id: string;
  campaignId: string;
  creatorId: string;
  message?: string;
  proposedPrice?: number;
  status: ApplicationStatus;
  contentSubmittedAt?: string | null;
  contentUrls?: string[];
  contentNote?: string | null;
  createdAt: string;
}

// PRD "CPA (Cost Per Action)" - 2026-07-11 qo'shildi
export interface ConversionDto {
  id: string;
  applicationId: string;
  type: ConversionType;
  amount: number;
  platformFee: number;
  payoutAmount: number;
  status: ConversionStatus;
  // 2026-07-12: CPA atributsiya ishonch darajasi - Mini App'da konversiya yonida
  // "qanday tasdiqlangan" belgisini ko'rsatish uchun (ratings/ishonch UI).
  source: ConversionSource;
  trackingRef?: string | null;
  note?: string | null;
  paidAt?: string | null;
  payoutReference?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
}

// PRD kelajak reja "Shop Integrations" - yengil versiya (2026-07-12). Biznes mahsulot
// ro'yxatini yuklaydi, "blogerlarga ko'rinsin" belgisi orqali avtomatik CPA kampaniyaga
// aylantiriladi (products.service.ts#setVisibility).
export interface ProductDto {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  currency: 'UZS' | 'USD';
  externalUrl: string;
  cpaRate: number;
  visibleToCreators: boolean;
  linkedCampaignId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowDto {
  id: string;
  campaignId: string;
  applicationId: string;
  amount: number;
  currency: 'UZS' | 'USD';
  commissionRate: number;
  status: EscrowStatus;
  depositReference?: string; // Payme/Click tranzaksiya ID
  payoutReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export { UserRole, CreatorTier, Platform, CollaborationModel, ContentType, CampaignStatus, ApplicationStatus, EscrowStatus, VerificationStatus, Language };
