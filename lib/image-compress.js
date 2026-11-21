// Client-side image processing: decode → downscale → re-encode, so every
// upload stays far below the 4 MB request budget.

const MAX_DIMENSION = 1568; // Groq vision sweet spot; also caps file size
const TARGET_QUALITY = 0.8;
const FALLBACK_QUALITY = 0.6;
const SOFT_BYTE_LIMIT = 900 * 1024;

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export function isSupportedImage(file) {
  return ACCEPTED_TYPES.has(String(file?.type || "").toLowerCase());
}

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode_failed"));
      element.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

// Returns { blob, width, height } or throws with a machine-readable code:
// "unsupported" | "decode_failed"
export async function compressImage(file) {
  if (!isSupportedImage(file)) throw new Error("unsupported");

  const source = await decode(file).catch(() => {
    throw new Error("decode_failed");
  });
  const width = source.width;
  const height = source.height;
  if (!width || !height) throw new Error("decode_failed");

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (typeof source.close === "function") source.close();

  let blob = await toBlob(canvas, TARGET_QUALITY);
  if (blob && blob.size > SOFT_BYTE_LIMIT) {
    blob = await toBlob(canvas, FALLBACK_QUALITY);
  }
  if (!blob) throw new Error("decode_failed");

  return { blob, width: canvas.width, height: canvas.height };
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}
