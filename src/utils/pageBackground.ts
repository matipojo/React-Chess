const MAX_INPUT_CHARS = 6_000_000;
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.82;

const DATA_URL_RE = /^data:(image\/(?:png|jpe?g|webp|gif|bmp));base64,([A-Za-z0-9+/=\s]+)$/i;
const RAW_BASE64_RE = /^[A-Za-z0-9+/=\s]+$/;
const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;

export type PreparedBackground =
  | { ok: true; cssUrl: string; kind: "data" | "url"; mimeType?: string }
  | { ok: false; message: string };

export function parseBackgroundToolArgs(params: Record<string, unknown>): {
  clear?: boolean;
  image?: string;
  mimeType?: string;
  url?: string;
} {
  return {
    clear: params.clear === true,
    image: typeof params.image === "string" ? params.image.trim() : undefined,
    mimeType: typeof params.mimeType === "string" ? params.mimeType.trim() : undefined,
    url: typeof params.url === "string" ? params.url.trim() : undefined,
  };
}

export function compactImageParam(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  if (value.startsWith("data:image") || value.length > 240) {
    return {
      omitted: "image",
      length: value.length,
      mime: mimeFromPayload(value),
    };
  }
  return value;
}

export function mimeFromPayload(value: string): string | undefined {
  const data = DATA_URL_RE.exec(value);
  if (data) {
    return data[1].toLowerCase().replace("image/jpg", "image/jpeg");
  }
  return undefined;
}

export function toDataUrl(image: string, mimeType?: string): { ok: true; dataUrl: string } | { ok: false; message: string } {
  const trimmed = image.trim();
  if (!trimmed) {
    return { ok: false, message: "No image data was provided." };
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    return { ok: false, message: "Image is too large to pass through WebMCP JSON arguments." };
  }

  const data = DATA_URL_RE.exec(trimmed);
  if (data) {
    return { ok: true, dataUrl: `data:${normalizeMime(data[1])};base64,${data[2].replace(/\s/g, "")}` };
  }

  if (trimmed.startsWith("data:")) {
    return { ok: false, message: "Only PNG, JPEG, WebP, GIF, or BMP data URLs are allowed." };
  }

  const mime = mimeType ? normalizeMime(mimeType) : undefined;
  if (!mime) {
    return { ok: false, message: "Raw base64 needs mimeType (for example image/png)." };
  }
  if (!RAW_BASE64_RE.test(trimmed) || trimmed.length < 16) {
    return { ok: false, message: "image must be a data URL or raw base64." };
  }
  return { ok: true, dataUrl: `data:${mime};base64,${trimmed.replace(/\s/g, "")}` };
}

function normalizeMime(mime: string): string {
  const lower = mime.trim().toLowerCase();
  if (lower === "image/jpg") {
    return "image/jpeg";
  }
  return lower;
}

export function isSafeImageHttpUrl(url: string): boolean {
  if (!HTTP_URL_RE.test(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function preparePageBackground(params: Record<string, unknown>): Promise<PreparedBackground> {
  const args = parseBackgroundToolArgs(params);
  if (args.url) {
    if (!isSafeImageHttpUrl(args.url)) {
      return { ok: false, message: "url must be an http(s) image link." };
    }
    return { ok: true, cssUrl: args.url, kind: "url" };
  }
  if (!args.image) {
    return { ok: false, message: "Provide image (base64 or data URL), url, or clear: true." };
  }
  const encoded = toDataUrl(args.image, args.mimeType);
  if (!encoded.ok) {
    return encoded;
  }
  try {
    const resized = await rasterizeDataUrl(encoded.dataUrl);
    return {
      ok: true,
      cssUrl: resized,
      kind: "data",
      mimeType: mimeFromPayload(resized) || mimeFromPayload(encoded.dataUrl),
    };
  } catch {
    return { ok: false, message: "Could not decode that image. Pass a PNG, JPEG, or WebP as base64 or a data URL." };
  }
}

async function rasterizeDataUrl(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.width, img.height, 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return dataUrl;
  }
  ctx.drawImage(img, 0, 0, width, height);
  try {
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });
}

export function cssBackgroundImage(cssUrl: string): string {
  const escaped = cssUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${escaped}")`;
}
