import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { geocode } from "@/lib/civic";

export function SearchBox({
  onResult,
  placeholder = "Search Southampton or enter a postcode",
}: {
  onResult: (r: { lat: number; lng: number; label: string }) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      const hit = await geocode(value);
      if (!hit) toast.error("We couldn't find that place or postcode.");
      else onResult(hit);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="civic-float flex h-12 items-center gap-2 px-3">
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search for a place or postcode"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}
