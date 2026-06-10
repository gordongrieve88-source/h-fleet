/**
 * Tiny inline icon set (heroicon-style 24px strokes) so the app has crisp,
 * consistent icons with zero dependencies. Add new ones here only.
 */
type P = { className?: string };
const base = "h-[18px] w-[18px] shrink-0";

function Svg({ className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? base}
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);
export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);
export const IconTv = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </Svg>
);
export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Svg>
);
export const IconCheckBadge = (p: P) => (
  <Svg {...p}>
    <path d="M12 2l2.4 2.4 3.4-.5.6 3.4 3 1.7-1.5 3 1.5 3-3 1.7-.6 3.4-3.4-.5L12 22l-2.4-2.4-3.4.5-.6-3.4-3-1.7 1.5-3-1.5-3 3-1.7.6-3.4 3.4.5z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);
export const IconPlane = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 13.5L3 11l1.5-2L19 6l-2.5 14-2-1.5-2.5-7.5z" />
    <path d="M10.5 13.5L9 19l2.5-2.5" />
  </Svg>
);
export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V8M10 20V4M16 20v-9M21 20H3" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Svg>
);
export const IconPeople = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    <path d="M16 4.8a3.5 3.5 0 010 6.4M17.5 15.7c2 .6 3.4 2 4 4.3" />
  </Svg>
);
export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5l1.2 2.6 2.8-.6 1 2.7 2.8.7-.6 2.8 2 2-2 2 .6 2.8-2.8.7-1 2.7-2.8-.6L12 21.5l-1.2-2.6-2.8.6-1-2.7-2.8-.7.6-2.8-2-2 2-2-.6-2.8 2.8-.7 1-2.7 2.8.6z" />
  </Svg>
);
export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
    <path d="M10 19a2 2 0 004 0" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </Svg>
);
export const IconSwap = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </Svg>
);
export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  </Svg>
);
export const IconStethoscope = (p: P) => (
  <Svg {...p}>
    <path d="M5 3v6a5 5 0 0010 0V3" />
    <path d="M10 14v2.5a4.5 4.5 0 009 0V13" />
    <circle cx="19" cy="11" r="2" />
  </Svg>
);
export const IconHistory = (p: P) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 109-9 9.2 9.2 0 00-7 3.3L3 8" />
    <path d="M3 3v5h5M12 7v5l3.5 2" />
  </Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconTruck = (p: P) => (
  <Svg {...p}>
    <path d="M2 7h11v9H2zM13 10h4.5L21 13.5V16h-8" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="16.5" cy="17.5" r="1.8" />
  </Svg>
);
