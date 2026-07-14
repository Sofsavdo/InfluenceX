type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneClasses: Record<Tone, string> = {
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
  info: 'bg-info-bg text-info-text',
  neutral: 'bg-ink-100 text-ink-600',
};

const dotClasses: Record<Tone, string> = {
  success: 'bg-success-dot',
  warning: 'bg-warning-dot',
  danger: 'bg-danger-dot',
  info: 'bg-info-dot',
  neutral: 'bg-ink-400',
};

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className = '',
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneClasses[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />}
      {children}
    </span>
  );
}

// Backend status qiymatlarini (masalan CampaignStatus, ApplicationStatus, EscrowStatus)
// vizual ohangga (tone) moslashtiruvchi umumiy xarita - har bir sahifada qaytadan
// yozilmasligi uchun markazlashtirilgan (2026-07-14 dizayn tizimi).
const STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
  AWAITING_DEPOSIT: 'warning',
  HELD: 'info',
  RELEASE_PENDING: 'warning',
  RELEASED: 'success',
  REFUNDED: 'neutral',
  DISPUTED: 'danger',
  UNVERIFIED: 'neutral',
  VERIFIED: 'success',
  CONFIRMED: 'success',
  OPEN: 'warning',
  UNDER_REVIEW: 'info',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
