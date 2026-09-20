/**
 * Breeze Coffee brand mark: an espresso tile holding a cup, with a single
 * flowing line above it — steam and breeze in one stroke.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Breeze Coffee"
    >
      <rect width="48" height="48" rx="14" fill="#2a211b" />
      <path
        d="M14.5 15.5c2.6-3 5.2 3 7.8 0s5.2 3 7.8 0 4.2 1.6 5.2 0"
        fill="none"
        stroke="#7fd0b8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 24h22v3.2a9.2 9.2 0 0 1-9.2 9.2h-3.6A9.2 9.2 0 0 1 13 27.2V24z" fill="#f7f3ec" />
      <path
        d="M35 25.6h1.4a3.6 3.6 0 0 1 0 7.2H33.8"
        fill="none"
        stroke="#f7f3ec"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  size = 32,
  subtitle,
  className,
}: {
  size?: number;
  /** Small line under the wordmark, e.g. the store name. */
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      <div className="leading-none">
        <p className="text-[17px] font-bold tracking-tight text-zinc-900">Breeze</p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.32em] text-zinc-400">
          {subtitle ?? "Coffee"}
        </p>
      </div>
    </div>
  );
}
