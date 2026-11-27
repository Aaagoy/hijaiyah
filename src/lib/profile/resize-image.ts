/**
 * Browser only: crop the middle square of a photo and shrink it to `size`×`size`.
 * WebP when the browser can encode it (about 20 KB), otherwise JPEG (older Safari).
 */
export async function resizeToSquare(file: File, size = 256): Promise<Blob> {
  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (!side) throw new Error("Gambar tidak bisa dibaca.");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa memproses gambar.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);

  const webp = await toBlob(canvas, "image/webp", 0.85);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("Browser tidak bisa memproses gambar.");
  return jpeg;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak bisa dibaca."));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
