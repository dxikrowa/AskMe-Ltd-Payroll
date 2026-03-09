import path from "path";
import fs from "fs/promises";
import { del, get, put } from "@vercel/blob";

const DISK_BASE = process.env.PDF_STORAGE_PATH || path.join(process.cwd(), "storage");
const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function normalizeStoredPath(input: string) {
  const value = (input || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(value);

  if (!normalized || normalized.startsWith("..") || normalized.includes("../")) {
    throw new Error("Invalid PDF path");
  }

  return normalized;
}

function toBuffer(data: Uint8Array | Buffer | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  return Buffer.from(data);
}

export async function savePrivatePdf(
  storedPath: string,
  data: Uint8Array | Buffer | ArrayBuffer
) {
  const normalized = normalizeStoredPath(storedPath);
  const body = toBuffer(data);

  if (USE_BLOB) {
    const blob = await put(normalized, body, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/pdf",
    });

    return {
      storage: "blob" as const,
      storedPath: blob.pathname,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
    };
  }

  const absolutePath = path.join(DISK_BASE, normalized);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, body);

  return {
    storage: "disk" as const,
    storedPath: normalized,
    url: null,
    downloadUrl: null,
  };
}

export async function getPrivatePdf(storedPath: string) {
  const normalized = normalizeStoredPath(storedPath);

  if (USE_BLOB) {
    const result = await get(normalized, { access: "private" });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    return {
      storage: "blob" as const,
      stream: result.stream,
      contentType: result.blob.contentType || "application/pdf",
      fileName: path.posix.basename(result.blob.pathname),
    };
  }

  const absolutePath = path.join(DISK_BASE, normalized);
  const buffer = await fs.readFile(absolutePath);

  return {
    storage: "disk" as const,
    buffer,
    contentType: "application/pdf",
    fileName: path.posix.basename(normalized),
  };
}

export async function deletePrivatePdf(storedPath: string | null | undefined) {
  if (!storedPath) return;

  const normalized = normalizeStoredPath(storedPath);

  if (USE_BLOB) {
    await del(normalized);
    return;
  }

  const absolutePath = path.join(DISK_BASE, normalized);

  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignore missing files
  }
}