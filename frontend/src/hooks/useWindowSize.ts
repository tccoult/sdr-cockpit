import { useLayoutEffect, useState } from "react";

export function useWindowSize() {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);

  useLayoutEffect(() => {
    let resizeTimer: number;

    function handleResize() {
      // Clear any existing timer
      clearTimeout(resizeTimer);

      resizeTimer = window.setTimeout(() => {
        setSize([window.innerWidth, window.innerHeight]);
      }, 100);
    }

    window.addEventListener("resize", handleResize);

    // Set initial size
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return { width: size[0], height: size[1] };
}
