/**
 * The product's mark: a ledger column rising in three strokes.
 * Drawn for this product, not a letter in a square.
 */
export default function BrandMark({ size = 22 }) {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1.75"
        y="1.75"
        width="20.5"
        height="20.5"
        rx="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path d="M7.25 17v-3" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17v-6.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.75 17V7.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
