import { useLayoutEffect, useState } from "react";

export function useWindowSize() {
  const [size, setSize] = useState<[number, number]>([0, 0]);

  useLayoutEffect(() => {
    let resizeTimer: number;

    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }

    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateSize, 100);
    }

    updateSize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return { width: size[0], height: size[1] };
}
