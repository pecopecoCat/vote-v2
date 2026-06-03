/** 作成フォームの A/B 画像：選択時にクライアントで縮小・JPEG 化（将来はアップロード前処理に流用） */

export const VOTE_IMAGE_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const VOTE_IMAGE_MAX_EDGE_PX = 1200;
const JPEG_QUALITY_PRIMARY = 0.82;
const JPEG_QUALITY_FALLBACK = 0.65;
const FALLBACK_MAX_EDGE_PX = 1024;
/** data URL 文字列の目安上限（localStorage / KV 向け） */
const MAX_DATA_URL_LENGTH = 600_000;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした。"));
    };
    img.src = url;
  });
}

function scaledSize(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height };
  }
  if (width >= height) {
    return { width: maxEdge, height: Math.max(1, Math.round((height * maxEdge) / width)) };
  }
  return { width: Math.max(1, Math.round((width * maxEdge) / height)), height: maxEdge };
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("画像の変換に失敗しました。"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") resolve(result);
          else reject(new Error("画像の変換に失敗しました。"));
        };
        reader.onerror = () => reject(new Error("画像の変換に失敗しました。"));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function encodeImage(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number
): Promise<string> {
  const { width, height } = scaledSize(img.naturalWidth, img.naturalHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像の処理に対応していない環境です。");
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToJpegDataUrl(canvas, quality);
}

/**
 * 写真1枚を data URL（JPEG）に変換。元ファイルが大きい場合は縮小・圧縮する。
 */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選んでください。");
  }
  if (file.size > VOTE_IMAGE_MAX_INPUT_BYTES) {
    throw new Error("画像は5MB以下にしてください。");
  }

  const img = await loadImageFromFile(file);
  let dataUrl = await encodeImage(img, VOTE_IMAGE_MAX_EDGE_PX, JPEG_QUALITY_PRIMARY);

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    dataUrl = await encodeImage(img, FALLBACK_MAX_EDGE_PX, JPEG_QUALITY_FALLBACK);
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error("画像が大きすぎます。別の写真をお試しください。");
  }

  return dataUrl;
}
