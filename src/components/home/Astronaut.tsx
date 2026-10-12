/**
 * Decorative hero illustration: an astronaut reading on a tablet, floating past a
 * planet. Accent-coloured parts use `currentColor`, so set the colour on the parent.
 */
export function Astronaut({ className = "" }: { className?: string }) {
  const ink = "#111111";
  const suit = "#ffffff";
  const shade = "#d9dde5";

  return (
    <svg viewBox="0 0 260 230" className={className} role="img" aria-hidden="true">
      {/* Space bubble */}
      <path
        d="M58 40C92 6 160 2 205 28c38 22 52 70 40 112-11 40-44 72-90 80-48 9-101-6-128-44C2 140 8 96 26 70c8-12 18-22 32-30z"
        fill="#141414" stroke="#2c2c2c" strokeWidth="1.5"
      />
      <ellipse cx="44" cy="36" rx="14" ry="11" fill="#141414" stroke="#2c2c2c" strokeWidth="1.5" />
      <circle cx="24" cy="22" r="6" fill="#141414" stroke="#2c2c2c" strokeWidth="1.5" />

      {/* Stars */}
      <g fill="#ffffff">
        <circle cx="70" cy="40" r="2" />
        <circle cx="210" cy="58" r="1.6" />
        <circle cx="226" cy="120" r="2" />
        <circle cx="48" cy="150" r="1.6" />
        <circle cx="100" cy="196" r="1.4" />
        <circle cx="160" cy="30" r="1.4" />
        <path d="M196 36l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" />
        <path d="M40 104l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" />
        <path d="M232 168l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </g>

      {/* Planet */}
      <g transform="translate(188 176)">
        <circle r="34" fill="currentColor" stroke={ink} strokeWidth="3" />
        <path d="M-30-14c20 6 40 6 60 0M-34 2c22 7 46 7 68 0M-28 18c18 6 38 6 56 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity=".55" />
        <circle cx="-12" cy="-16" r="5" fill="#ffffff" opacity=".35" />
      </g>

      {/* Astronaut */}
      <g transform="rotate(-14 130 110)" strokeLinecap="round" strokeLinejoin="round">
        {/* Backpack */}
        <rect x="132" y="84" width="34" height="56" rx="9" fill={shade} stroke={ink} strokeWidth="3" />

        {/* Legs (outline, then fill) */}
        <path d="M120 146l-6 34M146 146l12 30" stroke={ink} strokeWidth="19" fill="none" />
        <path d="M120 146l-6 34M146 146l12 30" stroke={suit} strokeWidth="13" fill="none" />
        <rect x="100" y="176" width="26" height="14" rx="6" fill={shade} stroke={ink} strokeWidth="3" />
        <rect x="148" y="171" width="26" height="14" rx="6" fill={shade} stroke={ink} strokeWidth="3" transform="rotate(-20 161 178)" />

        {/* Body */}
        <rect x="100" y="94" width="58" height="62" rx="18" fill={suit} stroke={ink} strokeWidth="3" />
        <rect x="114" y="112" width="28" height="20" rx="4" fill={shade} stroke={ink} strokeWidth="2.5" />
        <circle cx="121" cy="122" r="3" fill="currentColor" />
        <circle cx="131" cy="122" r="3" fill={ink} />
        <path d="M112 142h34" stroke={ink} strokeWidth="2.5" />

        {/* Arm holding the tablet */}
        <path d="M106 112c-14 2-24 0-34-8" stroke={ink} strokeWidth="18" fill="none" />
        <path d="M106 112c-14 2-24 0-34-8" stroke={suit} strokeWidth="12" fill="none" />
        {/* Other arm */}
        <path d="M156 112c10 8 14 18 10 30" stroke={ink} strokeWidth="18" fill="none" />
        <path d="M156 112c10 8 14 18 10 30" stroke={suit} strokeWidth="12" fill="none" />
        <circle cx="166" cy="144" r="8" fill={shade} stroke={ink} strokeWidth="3" />

        {/* Tablet */}
        <g transform="rotate(-18 58 88)">
          <rect x="38" y="70" width="40" height="32" rx="5" fill="currentColor" stroke={ink} strokeWidth="3" />
          <path d="M58 94c-9-6-12-10-12-14 0-3 2.5-5.5 5.5-5.5 2.6 0 4.6 1.6 6.5 4 1.9-2.4 3.9-4 6.5-4 3 0 5.5 2.5 5.5 5.5 0 4-3 8-12 14z" fill="#ffffff" />
        </g>
        <circle cx="72" cy="104" r="8" fill={shade} stroke={ink} strokeWidth="3" />

        {/* Helmet */}
        <circle cx="128" cy="68" r="32" fill={suit} stroke={ink} strokeWidth="3" />
        <rect x="104" y="50" width="48" height="36" rx="16" fill="#1d2b45" stroke={ink} strokeWidth="3" />
        <path d="M112 60c4-4 9-5 14-4" stroke="#ffffff" strokeWidth="3" fill="none" opacity=".8" />
        <circle cx="146" cy="78" r="2.5" fill="#ffffff" opacity=".6" />
        <rect x="156" y="58" width="8" height="18" rx="3" fill={shade} stroke={ink} strokeWidth="2.5" />
      </g>
    </svg>
  );
}
