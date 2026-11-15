/** Neutral stand-in for imagery until real assets exist. Fills its parent. */
export function PlaceholderMedia({ label, tone = 0 }: { label?: string; tone?: number }) {
  const tones = [
    "linear-gradient(160deg, var(--color-surface-strong), var(--color-fg-muted))",
    "linear-gradient(200deg, var(--color-surface), var(--color-surface-strong))",
    "linear-gradient(120deg, var(--color-fg-muted), var(--color-fg))",
  ];
  return (
    <div className="relative size-full" style={{ background: tones[tone % tones.length] }}>
      {label && (
        <span className="absolute bottom-4 left-4 font-mono text-xs tracking-wide text-bg/80 uppercase">{label}</span>
      )}
    </div>
  );
}
