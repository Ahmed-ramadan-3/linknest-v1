/** LinkNest mark: two interlocked links with three connected nodes. Uses currentColor. */
export function LogoMark({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      className={`logo-mark${animated ? ' logo-mark--animated' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="logo-mark__links" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <rect className="logo-mark__link logo-mark__link--a" x="5" y="14" width="26" height="14" rx="7" transform="rotate(-35 18 21)" pathLength="1" />
        <rect className="logo-mark__link logo-mark__link--b" x="17" y="22" width="26" height="14" rx="7" transform="rotate(-35 30 29)" pathLength="1" />
      </g>
      <g className="logo-mark__nodes" fill="currentColor">
        <circle className="logo-mark__node logo-mark__node--1" cx="9" cy="38" r="2.6" />
        <circle className="logo-mark__node logo-mark__node--2" cx="40" cy="9" r="2.6" />
        <circle className="logo-mark__node logo-mark__node--3" cx="24" cy="43" r="2" />
      </g>
    </svg>
  );
}
