/** Largest side of a stored profile photo, in pixels. A square crop keeps the stored data URL small (about 10-20 KB). */
export const AVATAR_SIZE = 256;
export const AVATAR_MAX_FILE_BYTES = 10 * 1024 * 1024;

export class AvatarError extends Error {}

/** Centre-crops the picked image to a square and returns it as a small JPEG data URL. */
export async function resizeAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new AvatarError("Choose an image file.");
  if (file.size > AVATAR_MAX_FILE_BYTES) throw new AvatarError("That photo is too large. Choose one under 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new AvatarError("Couldn't read that image. Try a different photo."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new AvatarError("Couldn't read that image. Try a different photo.");
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new AvatarError("Couldn't process that photo on this device.");
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
