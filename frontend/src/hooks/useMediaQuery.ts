import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query and return whether it currently matches.
 * Handles server-side rendering and older browser fallbacks.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const getInitialMatch = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return defaultValue;
    }

    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getInitialMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const updateMatch = (event: MediaQueryListEvent | MediaQueryList) => {
      setMatches(event.matches);
    };

    // Ensure state is in sync when the effect runs
    setMatches(mediaQueryList.matches);

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", updateMatch);
      return () => mediaQueryList.removeEventListener("change", updateMatch);
    }

    // Fallback for Safari < 14 and older browsers
    mediaQueryList.addListener(updateMatch);
    return () => mediaQueryList.removeListener(updateMatch);
  }, [query, defaultValue]);

  return matches;
}
