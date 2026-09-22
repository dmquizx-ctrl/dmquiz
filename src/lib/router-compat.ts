// Compatibility helpers so the original pages can keep using a simple
// string-based navigate(path) API on top of TanStack Router.
import {
  useNavigate as useTanstackNavigate,
  useParams as useTanstackParams,
} from "@tanstack/react-router";
import { useCallback } from "react";

export function useNavigate() {
  const navigate = useTanstackNavigate();
  return useCallback(
    (to: string, options?: { replace?: boolean }) => {
      navigate({ to, replace: options?.replace } as never);
    },
    [navigate],
  );
}

export function useParams<T extends Record<string, string | undefined>>(): T {
  return (useTanstackParams as unknown as (opts: { strict: false }) => T)({ strict: false });
}
