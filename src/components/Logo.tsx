import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="CivicLense home">
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-primary">
        <span className="h-3 w-3 rounded-full border-2 border-primary-foreground" />
        <span className="absolute bottom-1.5 right-1.5 h-2 w-[3px] rotate-45 rounded-full bg-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-display text-[17px] font-semibold tracking-tight">
          Civic<span className="text-primary">Lense</span>
        </span>
      )}
    </Link>
  );
}
