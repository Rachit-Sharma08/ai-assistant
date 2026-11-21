const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

export function IconSidebar({ className = "h-5 w-5" }) {
  return (
    <svg {...stroke} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" />
    </svg>
  );
}

export function IconPlus({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconDots({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
    </svg>
  );
}

export function IconPencil({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconTrash({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function IconCopy({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </svg>
  );
}

export function IconCheck({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function IconRegenerate({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function IconSun({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </svg>
  );
}

export function IconMoon({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function IconArrowDown({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  );
}

export function IconSend({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} strokeWidth={2} className={className}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

export function IconStop({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}

export function IconX({ className = "h-5 w-5" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconSearch({ className = "h-4 w-4" }) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export function IconSpeaker({ className = "h-5 w-5" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" strokeLinejoin="round" />
      <path d="M15.5 9.5a4 4 0 0 1 0 5" />
      <path d="M18 7a8 8 0 0 1 0 10" />
    </svg>
  );
}

export function IconSpeakerOff({ className = "h-5 w-5" }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" strokeLinejoin="round" />
      <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
    </svg>
  );
}

export function Sparkle({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.5c.5 4.7 2.3 6.5 7 7-4.7.5-6.5 2.3-7 7-.5-4.7-2.3-6.5-7-7 4.7-.5 6.5-2.3 7-7z" />
      <path d="M19.5 15c.2 1.7.9 2.4 2.5 2.6-1.6.2-2.3.9-2.5 2.6-.2-1.7-.9-2.4-2.5-2.6 1.6-.2 2.3-.9 2.5-2.6z" />
    </svg>
  );
}
