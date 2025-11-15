import { useEffect, useRef } from "react";

/**
 * Register a handler that fires when the Escape key is pressed.
 * The handler is stored in a ref so subscriptions stay stable across renders.
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handlerRef.current();
      }
    };

    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [enabled]);
}
