/**
 * 2026-07-14: haqiqiy rasm (avatarUrl/logoUrl) qo'llab-quvvatlanadi. Ilgari
 * bu komponent faqat ism harfini ko'rsatardi - Profile.tsx esa buni chetlab
 * o'tib alohida <img> yozgan edi (ikki xil kod, bir xil vazifa uchun).
 */
export function Avatar({ name, src, size = 40 }: { name?: string; src?: string | null; size?: number }) {
  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className="rounded-full object-cover shrink-0 bg-ink-100"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-accent-100 text-accent-700 font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
