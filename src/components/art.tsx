/** Illustration d'ambiance : baobab devant un soleil couchant. Décorative, en SVG (quelques Ko). */
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 240" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd766" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#ffc83d" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffc83d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a7f5f" />
          <stop offset="1" stopColor="#053b31" />
        </linearGradient>
      </defs>

      <g className="float" style={{ transformOrigin: "300px 92px" }}>
        <circle cx="300" cy="92" r="92" fill="url(#sun-glow)" />
        <circle cx="300" cy="92" r="42" fill="#ffc83d" />
        <circle cx="300" cy="92" r="42" fill="#fff" opacity="0.12" />
      </g>

      {/* oiseaux */}
      <g fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round">
        <path d="M60 60q8-9 16 0q8-9 16 0" />
        <path d="M110 34q6-7 12 0q6-7 12 0" />
        <path d="M368 40q5-6 10 0q5-6 10 0" />
      </g>

      {/* sol */}
      <path d="M0 200 C90 186 180 210 260 196 C330 184 380 200 420 194 V240 H0 Z" fill="url(#ground)" />

      {/* baobab */}
      <g fill="#04241f" stroke="#04241f" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M132 206 C142 184 134 166 126 150 C120 138 118 128 124 120 L172 120 C178 128 176 138 170 150 C162 166 154 184 164 206 Z"
          strokeWidth="2"
        />
        <g fill="none" strokeWidth="9">
          <path d="M132 124 C112 112 96 100 84 82" />
          <path d="M148 120 C146 98 140 82 138 62" />
          <path d="M164 124 C184 112 200 98 212 78" />
          <path d="M156 120 C170 96 186 78 206 60" />
        </g>
        <g stroke="none">
          <ellipse cx="80" cy="72" rx="30" ry="18" />
          <ellipse cx="112" cy="52" rx="28" ry="16" />
          <ellipse cx="146" cy="42" rx="30" ry="17" />
          <ellipse cx="184" cy="48" rx="28" ry="16" />
          <ellipse cx="214" cy="64" rx="28" ry="17" />
          <ellipse cx="150" cy="70" rx="34" ry="18" />
        </g>
      </g>
    </svg>
  );
}
