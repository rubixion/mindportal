// Ollie the owl, the mascot artwork already used across MindPortal (popup + warning overlay).
import type { OllieMood } from "../../shared/types";

const MOODS: Record<OllieMood, { iris: string; mouth: string; cheek: number }> = {
  happy: { iris: "#6982d8", mouth: "M44 72 Q50 77 56 72", cheek: 0.35 },
  proud: { iris: "#4ade80", mouth: "M43 71 Q50 79 57 71", cheek: 0.5 },
  focused: { iris: "#6982d8", mouth: "M45 73 L55 73", cheek: 0 },
  hungry: { iris: "#fbbf24", mouth: "M46 72 Q50 75 54 72", cheek: 0.15 },
  sleepy: { iris: "#94a3b8", mouth: "M46 73 Q50 74 54 73", cheek: 0 },
  worried: { iris: "#fb923c", mouth: "M44 74 Q50 70 56 74", cheek: 0 },
  sad: { iris: "#f87171", mouth: "M44 75 Q50 69 56 75", cheek: 0 },
};

export function Ollie({ mood = "happy", size = 48 }: { mood?: OllieMood; size?: number }) {
  const m = MOODS[mood];
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" aria-hidden className="shrink-0 drop-shadow-[0_4px_16px_rgba(105,130,216,0.3)]">
      <ellipse cx="50" cy="97" rx="18" ry="14" fill="#171740" />
      <ellipse cx="31" cy="93" rx="10" ry="15" fill="#111130" transform="rotate(-12 31 93)" />
      <ellipse cx="69" cy="93" rx="10" ry="15" fill="#111130" transform="rotate(12 69 93)" />
      <circle cx="50" cy="54" r="28" fill="#1a1a42" />
      <polygon points="27,37 17,8 38,28" fill="#1a1a42" />
      <polygon points="73,37 83,8 62,28" fill="#1a1a42" />
      <ellipse cx="50" cy="56" rx="20" ry="18" fill="#20205a" />
      <circle cx="38" cy="51" r="10" fill="#fff" />
      <circle cx="62" cy="51" r="10" fill="#fff" />
      <circle cx="38" cy="51" r="6" fill={m.iris} />
      <circle cx="62" cy="51" r="6" fill={m.iris} />
      <circle cx="38" cy="51" r="3" fill="#05050f" />
      <circle cx="62" cy="51" r="3" fill="#05050f" />
      <circle cx="40" cy="49" r="1.5" fill="#fff" />
      <circle cx="64" cy="49" r="1.5" fill="#fff" />
      <circle cx="30" cy="64" r="4" fill={`rgba(249,115,22,${m.cheek})`} />
      <circle cx="70" cy="64" r="4" fill={`rgba(249,115,22,${m.cheek})`} />
      <path d="M46 62 L50 69 L54 62 Q50 60 46 62 Z" fill="#f5a623" />
      <path d={m.mouth} stroke={m.iris} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="91" rx="12" ry="8" fill="#20205a" />
    </svg>
  );
}
