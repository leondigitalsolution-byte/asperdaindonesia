
// HAPUS baris import ini agar Vite tidak error mencari di node_modules
// import imageCompression from 'browser-image-compression';

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

// Kita deklarasikan bahwa variable 'imageCompression' sudah ada secara global (dari script tag di index.html)
declare const imageCompression: (file: File, options: Options) => Promise<File>;

/**
 * Compresses an image file ensuring it is below a certain size and dimension.
 * Optimized for web upload (Supabase Storage).
 */
export const compressImage = async (file: File): Promise<File> => {
  // Options for compression
  const options = {
    maxSizeMB: 0.8,          // Max size 800KB (ideal for web/mobile)
    maxWidthOrHeight: 1920,  // Resize large images (e.g. 4K photos) to 1080p standard
    useWebWorker: true,      // Use multi-threading for performance
    fileType: 'image/jpeg',  // Force convert to JPEG for better compression
    initialQuality: 0.8      // Quality balance
  };

  try {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Skip compression for very small files (< 200KB)
    if (file.size / 1024 / 1024 < 0.2) {
        return file;
    }

    console.log(`Compressing ${file.name}... Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Check if library is loaded (Global variable check)
    // @ts-ignore
    if (typeof imageCompression === 'undefined') {
        console.warn("browser-image-compression library not loaded properly via CDN. Skipping compression.");
        return file;
    }

    const compressedFile = await imageCompression(file, options);
    console.log(`Compression done. New size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    return compressedFile;
  } catch (error) {
    console.error("Image compression failed:", error);
    // If compression fails, return original file to avoid blocking user
    return file; 
  }
};
