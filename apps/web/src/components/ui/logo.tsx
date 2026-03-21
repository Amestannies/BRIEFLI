import { cn } from '@briefli/ui';

interface BriefcaseLogoProps {
  size?: number;
  className?: string;
}

export function BriefcaseLogo({ size = 32, className }: BriefcaseLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('briefcase-float', className)}
      aria-hidden="true"
    >
      {/* Handle */}
      <path
        d="M14 12V9C14 7.9 14.9 7 16 7H24C25.1 7 26 7.9 26 9V12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Body */}
      <rect
        x="5"
        y="12"
        width="30"
        height="21"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Center dividing line */}
      <line
        x1="5"
        y1="22.5"
        x2="35"
        y2="22.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Latch/clasp */}
      <rect
        x="16.5"
        y="20"
        width="7"
        height="5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="briefcase-latch"
      />
    </svg>
  );
}

interface LogoWithTextProps {
  dark?: boolean;
  size?: number;
  className?: string;
}

export function LogoWithText({ dark = false, size = 32, className }: LogoWithTextProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BriefcaseLogo
        size={size}
        className={dark ? 'text-foreground' : 'text-white'}
      />
      <span
        className={cn(
          'font-serif text-2xl font-bold tracking-tight leading-none',
          dark ? 'text-foreground' : 'text-white',
        )}
        style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
      >
        Briefli
      </span>
    </div>
  );
}

export default BriefcaseLogo;
