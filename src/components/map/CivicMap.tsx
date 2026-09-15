import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, type ComponentProps } from "react";

const MapCanvas = lazy(() => import("./MapCanvas"));

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Loading map…
      </div>
    </div>
  );
}

export function CivicMap(props: ComponentProps<typeof MapCanvas>) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <MapCanvas {...props} />
      </Suspense>
    </ClientOnly>
  );
}
