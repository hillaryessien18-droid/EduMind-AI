export default function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-label="EduMind AI">
      <defs>
        <linearGradient id="edumind-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#edumind-g)" />
      <path d="M10 21V11h9M10 16h7M10 21h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="23" cy="10" r="2" fill="#fff" />
    </svg>
  );
}
