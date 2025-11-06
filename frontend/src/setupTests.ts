import "@testing-library/jest-dom";

type TestGlobal = typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver;
  ImageData?: typeof ImageData;
};

const testGlobal = globalThis as TestGlobal;

if (!testGlobal.ResizeObserver) {
  class ResizeObserverPolyfill implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      void callback;
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  testGlobal.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

if (!testGlobal.ImageData) {
  class ImageDataPolyfill implements ImageData {
    readonly width: number;
    readonly height: number;
    readonly colorSpace: PredefinedColorSpace = "srgb";
    private readonly internalData: Uint8ClampedArray;

    constructor(
      widthOrData: number | Uint8ClampedArray,
      heightOrWidth?: number,
      height?: number
    ) {
      if (widthOrData instanceof Uint8ClampedArray) {
        const buffer = new ArrayBuffer(widthOrData.length);
        const copy = new Uint8ClampedArray(buffer);
        copy.set(widthOrData);
        this.internalData = copy;
        this.width = heightOrWidth ?? 0;
        this.height = height ?? 0;
      } else {
        const w = widthOrData;
        const h = heightOrWidth ?? 0;
        this.width = w;
        this.height = h;
        const byteLength = Math.max(0, w * h * 4);
        this.internalData = new Uint8ClampedArray(new ArrayBuffer(byteLength));
      }
    }

    get data(): ImageData["data"] {
      return this.internalData as unknown as ImageData["data"];
    }
  }
  testGlobal.ImageData = ImageDataPolyfill as unknown as typeof ImageData;
}

const createImageDataStub = (): ImageData => new (testGlobal.ImageData!)(1, 1);

const zeroTextMetrics: TextMetrics = {
  width: 0,
  actualBoundingBoxAscent: 0,
  actualBoundingBoxDescent: 0,
  actualBoundingBoxLeft: 0,
  actualBoundingBoxRight: 0,
  fontBoundingBoxAscent: 0,
  fontBoundingBoxDescent: 0,
  emHeightAscent: 0,
  emHeightDescent: 0,
  hangingBaseline: 0,
  alphabeticBaseline: 0,
  ideographicBaseline: 0,
};

const mockGetContext = (): CanvasRenderingContext2D =>
  ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => createImageDataStub(),
    putImageData: () => {},
    createImageData: () => createImageDataStub(),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    fillText: () => {},
    measureText: () => zeroTextMetrics,
    transform: () => {},
    rect: () => {},
    clip: () => {},
  } as unknown as CanvasRenderingContext2D);

const getContextMockImpl = function (
  this: HTMLCanvasElement,
  contextId: string
): CanvasRenderingContext2D | null {
  if (contextId === "2d") {
    return mockGetContext();
  }
  return null;
};

HTMLCanvasElement.prototype.getContext = getContextMockImpl as typeof HTMLCanvasElement.prototype.getContext;

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
