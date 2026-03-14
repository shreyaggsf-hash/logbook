import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F2EDE3",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 512 512"
          width="180"
          height="180"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* BOOK */}
          <g transform="translate(128,138)" stroke="#6B1A26" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M2,-48 C-10,-48 -52,-40 -52,44 L2,44"/>
            <path d="M2,-48 C14,-48 56,-40 56,44 L2,44"/>
            <line x1="2" y1="-48" x2="2" y2="44"/>
            <line x1="-40" y1="-10" x2="-10" y2="-10"/>
            <line x1="-42" y1="6"  x2="-10" y2="6"/>
            <line x1="-40" y1="22" x2="-10" y2="22"/>
            <line x1="14" y1="-10" x2="44" y2="-10"/>
            <line x1="14" y1="6"   x2="46" y2="6"/>
            <line x1="14" y1="22"  x2="44" y2="22"/>
          </g>
          {/* CLAPPERBOARD */}
          <g transform="translate(384,138)" stroke="#6B1A26" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <rect x="-54" y="-14" width="108" height="76" rx="7"/>
            <rect x="-54" y="-58" width="108" height="44" rx="5"/>
            <line x1="-30" y1="-58" x2="-54" y2="-14"/>
            <line x1="-4"  y1="-58" x2="-28" y2="-14"/>
            <line x1="22"  y1="-58" x2="-2"  y2="-14"/>
            <line x1="48"  y1="-58" x2="24"  y2="-14"/>
          </g>
          {/* HEADPHONES */}
          <g transform="translate(128,374)" stroke="#6B1A26" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M-48,16 A52,56 0 0 1 48,16"/>
            <rect x="-66" y="8" width="28" height="44" rx="10"/>
            <rect x="38"  y="8" width="28" height="44" rx="10"/>
            <path d="M-14,12 Q-22,30 -14,48"/>
            <path d="M0,4   Q-10,30  0,56"/>
            <path d="M14,12 Q22,30  14,48"/>
          </g>
          {/* MUSEUM */}
          <g transform="translate(384,374)" stroke="#6B1A26" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M-58,-16 L0,-56 L58,-16"/>
            <line x1="-38" y1="-16" x2="-38" y2="34"/>
            <line x1="-13" y1="-16" x2="-13" y2="34"/>
            <line x1="13"  y1="-16" x2="13"  y2="34"/>
            <line x1="38"  y1="-16" x2="38"  y2="34"/>
            <line x1="-58" y1="34" x2="58" y2="34"/>
            <line x1="-64" y1="46" x2="64" y2="46"/>
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
