import type { CareId } from './model';
const silhouettes: Record<CareId, string> = {
  baby_feed: 'M9 2h6v3h2v4h2v12H5V9h2V5h2V2Zm0 7v2H7v8h10v-8h-2V9H9Z',
  baby_bath:
    'M3 11h18v3h-2v5h-2v2h-2v-2H9v2H7v-2H5v-5H3v-3Zm2-7h4v2H7v3H5V4Zm7 2h3v3h-3V6Zm5-4h3v3h-3V2Z',
  baby_diaper: 'M3 6h18v5h-2v5h-3v4H8v-4H5v-5H3V6Zm4 2v3h3v3h4v-3h3V8H7Z',
  baby_play: 'M8 2h8v2h4v4h2v8h-2v4h-4v2H8v-2H4v-4H2V8h2V4h4V2Zm2 4v4H6v4h4v4h4v-4h4v-4h-4V6h-4Z',
  baby_cuddle: 'M4 4h6v2h4V4h6v2h2v8h-2v2h-2v2h-2v2h-2v2h-4v-2H8v-2H6v-2H4v-2H2V6h2V4Z',
  baby_sleep: 'M12 2h5v2h-4v3h-2v7h2v3h4v2h4v2h-5v1H9v-2H5v-3H3v-5h2V7h3V4h4V2Z',
};
/** Original tiny stepped silhouettes; no external artwork or new asset dependency. */
export function CareIcon({ activity }: { activity: CareId }) {
  return (
    <svg className="care-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={silhouettes[activity]} fill="currentColor" />
    </svg>
  );
}
