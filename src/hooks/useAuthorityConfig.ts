import { useQuery } from "@tanstack/react-query";

import { fetchPrimaryAuthorityConfig, type AuthorityConfig } from "@/lib/civic";

export const authorityConfigQueryOptions = {
  queryKey: ["authority-config"] as const,
  queryFn: fetchPrimaryAuthorityConfig,
  staleTime: 3_600_000,
};

/** Active authority configuration for the current deployment. */
export function useAuthorityConfig(): {
  config: AuthorityConfig | null | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery(authorityConfigQueryOptions);
  return { config: data, isLoading };
}
