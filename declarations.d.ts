
declare module 'browser-image-compression' {
  interface Options {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    maxIteration?: number;
    exifOrientation?: number;
    onProgress?: (p: number) => void;
    fileType?: string;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
    signal?: AbortSignal;
  }

  function imageCompression(file: File, options: Options): Promise<File>;

  namespace imageCompression {
    function getDataUrlFromFile(file: File): Promise<string>;
    function getFilefromDataUrl(dataUrl: string, filename: string): Promise<File>;
    function drawImageInCanvas(img: HTMLImageElement, fileType?: string): Promise<HTMLCanvasElement>;
  }

  export default imageCompression;
}
