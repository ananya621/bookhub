"use client";

/*
 * The slide-up panel from Prototype Mobile.dc.html (`.sheet` + `.veil`
 * + `.grab`, e.g. lines 609-622 for the reading-status picker). Mobile
 * only by convention here — every call site wraps its trigger button in
 * .mobile-only and keeps the existing desktop control unchanged, rather
 * than this component enforcing that itself, so it stays reusable for
 * a sheet that's wanted at any width later.
 */
export default function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <div className="veil" onClick={onClose} />
      <div className="sheet">
        <div className="grab" />
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 21 }}>{title}</div>
        {subtitle && (
          <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 14 }}>
            {subtitle}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
