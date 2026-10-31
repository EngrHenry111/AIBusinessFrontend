// The BizlyAI mark: a "B" with a chat tail (conversations) and a spark cut
// from its lower bowl (AI). Keep in sync with public/favicon.svg, which the
// PWA icons and og-image are rendered from (scripts/render-og.mjs).
const GLYPH = 'M19 11h17.5C43.4 11 48 15.8 48 21.8c0 3.6-1.7 6.5-4.4 8.4 3.7 1.8 6.4 5.4 6.4 10 0 6.8-5.3 11.8-12.4 11.8H25l-8.5 7c-.6.5-1.5 0-1.5-.8V15c0-2.2 1.800-4 4-4Zm6.500 9v8H35a4 4 0 0 0 0-8h-9.500Zm9.500 13.500c-.6 3.900-2.600 5.900-6.500 6.500 3.900.6 5.900 2.600 6.500 6.500.6-3.900 2.600-5.900 6.500-6.500-3.900-.6-5.900-2.600-6.500-6.500Z';

export default function BrandMark({ size, className }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#0E2A22" />
      <path d={GLYPH} fill="#F2A93B" fillRule="evenodd" />
    </svg>
  );
}
