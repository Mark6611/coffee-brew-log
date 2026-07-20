// Client-side image downscaling. Photos are stored inline on the bag/brew row
// as a JPEG data URL (no Supabase Storage bucket — phase 1 keeps everything on
// the one sync rail), so they must be small: bounded to MAX_DIM on the long
// edge and re-encoded at QUALITY. A 12MP phone photo (~3-5 MB) comes out around
// 100-250 KB, which rides the existing row upsert without special handling.

export const MAX_DIM = 1280;
export const QUALITY = 0.72;

/** Scale (w,h) to fit within a maxDim square, preserving aspect. No upscaling. */
export function fitWithin(w: number, h: number, maxDim: number): { width: number; height: number } {
	if (w <= 0 || h <= 0) return { width: 0, height: 0 };
	if (w <= maxDim && h <= maxDim) return { width: w, height: h };
	const scale = maxDim / Math.max(w, h);
	return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/**
 * Decode an image File, downscale it to fit MAX_DIM, and return a JPEG data URL.
 * Honors EXIF orientation (phone photos are often rotated). Returns null if the
 * file isn't a decodable image. Browser-only (needs canvas + createImageBitmap).
 */
export async function fileToPhoto(
	file: File,
	maxDim = MAX_DIM,
	quality = QUALITY
): Promise<string | null> {
	if (!file.type.startsWith('image/')) return null;
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		return null;
	}
	try {
		const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDim);
		if (width === 0 || height === 0) return null;
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.drawImage(bitmap, 0, 0, width, height);
		return canvas.toDataURL('image/jpeg', quality);
	} finally {
		bitmap.close?.();
	}
}
