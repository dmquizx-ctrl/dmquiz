// Compatibility helpers so the original pages can keep using a simple
// string-based navigate(path) API on top of TanStack Router.
import {
  useNavigate as useTanstackNavigate,
  useParams as useTanstackParams,
} from "@tanstack/react-router";

export function useNavigate() {
  const navigate = useTanstackNavigate();
  return (to: string, options?: { replace?: boolean }) => {
    navigate({ to, replace: options?.replace } as never);
  };
}

export function useParams<T extends Record<string, string | undefined>>(): T {
  return useTanstackParams({ strict: false }) as T;
}
