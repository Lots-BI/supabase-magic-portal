import { validateMaterialFile } from "../client/direct-media-upload";
import {
  exceedsStorageAllocation,
  STORAGE_ALLOCATION_BYTES,
  STORAGE_FIT_TARGET_BYTES,
} from "./material-upload";

const LIMIT_LABEL = "50 MB";

export function replaceExtension(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`.slice(0, 180);
}

/** Bits por segundo para o vídeo caber na meta, já descontando o áudio. */
export function estimateVideoBitsPerSecond(durationSec: number, targetBytes: number): number {
  const duration = Math.max(durationSec, 0.5);
  const audioBits = 128_000;
  const total = Math.floor((targetBytes * 8) / duration) - audioBits;
  return Math.max(80_000, Math.min(8_000_000, total));
}

export async function prepareUploadFile(
  original: File,
  onProgress?: (pct: number) => void,
): Promise<{ file: File; mimeType: string; fileName: string; compressed: boolean }> {
  const resolved = await validateMaterialFile(original);
  if (!exceedsStorageAllocation(resolved.file.size)) {
    return { ...resolved, compressed: false };
  }
  onProgress?.(1);
  const fitted = await fitMediaToAllocation(
    resolved.file,
    resolved.mimeType,
    resolved.fileName,
    onProgress,
  );
  return { ...fitted, compressed: true };
}

async function fitMediaToAllocation(
  file: File,
  mimeType: string,
  fileName: string,
  onProgress?: (pct: number) => void,
): Promise<{ file: File; mimeType: string; fileName: string }> {
  if (mimeType.startsWith("image/")) {
    return compressImage(file, fileName, onProgress);
  }
  if (mimeType.startsWith("video/")) {
    return compressVideo(file, fileName, onProgress);
  }
  throw new Error(
    `Este arquivo passa de ${LIMIT_LABEL}, o limite do armazenamento. Envie um arquivo menor.`,
  );
}

async function compressImage(
  file: File,
  fileName: string,
  onProgress?: (pct: number) => void,
): Promise<{ file: File; mimeType: string; fileName: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(
        "Não deu para reduzir esta foto. Envie em JPG ou um arquivo menor que 50 MB.",
      );
    }
  }
  try {
    let scale = 1;
    const longSide = Math.max(bitmap.width, bitmap.height);
    if (longSide > 2560) scale = 2560 / longSide;
    let quality = 0.85;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      onProgress?.(Math.round(((attempt + 1) / 6) * 100));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível reduzir a foto.");
      ctx.drawImage(bitmap, 0, 0, width, height);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= STORAGE_FIT_TARGET_BYTES) break;
      quality = Math.max(0.45, quality - 0.12);
      scale *= 0.75;
    }
    if (!blob || blob.size > STORAGE_ALLOCATION_BYTES) {
      throw new Error("A foto continua maior que 50 MB mesmo reduzida. Envie outra.");
    }
    const name = replaceExtension(fileName, "jpg");
    return {
      file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }),
      mimeType: "image/jpeg",
      fileName: name,
    };
  } finally {
    bitmap.close();
  }
}

function recorderMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options = [
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  return options.find((option) => MediaRecorder.isTypeSupported(option.mime)) ?? null;
}

async function compressVideo(
  file: File,
  fileName: string,
  onProgress?: (pct: number) => void,
): Promise<{ file: File; mimeType: string; fileName: string }> {
  const chosen = recorderMime();
  if (!chosen || typeof document === "undefined") {
    throw new Error(
      `Este vídeo passa de ${LIMIT_LABEL} e este aparelho não consegue reduzi-lo. Grave um trecho menor ou em qualidade mais baixa.`,
    );
  }
  let bitrateScale = 1;
  let last: { file: File; mimeType: string; fileName: string } | null = null;
  for (let pass = 0; pass < 2; pass += 1) {
    last = await recordVideo(file, fileName, chosen, bitrateScale, onProgress);
    if (last.file.size <= STORAGE_ALLOCATION_BYTES) return last;
    bitrateScale *= 0.45;
  }
  if (last && last.file.size <= STORAGE_ALLOCATION_BYTES) return last;
  throw new Error(
    "O vídeo continua maior que 50 MB mesmo reduzido. Grave um trecho menor e tente de novo.",
  );
}

async function recordVideo(
  file: File,
  fileName: string,
  chosen: { mime: string; ext: string },
  bitrateScale: number,
  onProgress?: (pct: number) => void,
): Promise<{ file: File; mimeType: string; fileName: string }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  video.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(video);
  let timer = 0;
  let recorder: MediaRecorder | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Não foi possível ler o vídeo para reduzir."));
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Não foi possível ler a duração do vídeo.");
    }
    if (!video.videoWidth) {
      await new Promise<void>((resolve) => {
        const wait = window.setTimeout(resolve, 4000);
        video.onloadeddata = () => {
          window.clearTimeout(wait);
          resolve();
        };
      });
    }
    const bits = Math.round(
      estimateVideoBitsPerSecond(duration, STORAGE_FIT_TARGET_BYTES) * bitrateScale,
    );
    const stream = videoStream(video);
    recorder = new MediaRecorder(stream, {
      mimeType: chosen.mime,
      videoBitsPerSecond: Math.max(80_000, bits),
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error("Não foi possível reduzir o vídeo."));
    });
    video.ontimeupdate = () => {
      if (duration > 0)
        onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));
    };
    const finished = new Promise<void>((resolve) => {
      video.onended = () => resolve();
      timer = window.setTimeout(resolve, (duration + 2) * 1000);
    });
    recorder.start(1000);
    await video.play();
    await finished;
    if (recorder.state === "recording") {
      recorder.requestData();
      recorder.stop();
    }
    await stopped;
    const type = chosen.mime.split(";")[0] || "video/mp4";
    const blob = new Blob(chunks, { type });
    if (blob.size <= 0) throw new Error("Não foi possível reduzir o vídeo.");
    const name = replaceExtension(fileName, chosen.ext);
    onProgress?.(100);
    return {
      file: new File([blob], name, { type, lastModified: Date.now() }),
      mimeType: type,
      fileName: name,
    };
  } finally {
    window.clearTimeout(timer);
    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop();
      } catch {
        /* já encerrado */
      }
    }
    video.pause();
    video.removeAttribute("src");
    video.remove();
    URL.revokeObjectURL(url);
  }
}

function videoStream(video: HTMLVideoElement): MediaStream {
  const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
  if (typeof capture === "function") return capture.call(video);

  const canvasCapture = (
    HTMLCanvasElement.prototype as HTMLCanvasElement & {
      captureStream?: (frameRate?: number) => MediaStream;
    }
  ).captureStream;
  if (typeof canvasCapture !== "function") {
    throw new Error(
      `Este vídeo passa de ${LIMIT_LABEL} e este aparelho não consegue reduzi-lo. Grave um trecho menor ou em qualidade mais baixa.`,
    );
  }
  const longest = Math.max(video.videoWidth || 720, video.videoHeight || 1280);
  const scale = Math.min(1, 1280 / longest);
  const width = Math.max(2, Math.round(((video.videoWidth || 720) * scale) / 2) * 2);
  const height = Math.max(2, Math.round(((video.videoHeight || 1280) * scale) / 2) * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível reduzir o vídeo.");
  }
  const stream = canvasCapture.call(canvas, 30);
  try {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(video);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    void audioCtx.resume();
    for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
  } catch {
    /* sem áudio neste aparelho — o vídeo ainda é reduzido */
  }
  const draw = () => {
    if (video.ended || video.paused) return;
    ctx.drawImage(video, 0, 0, width, height);
    requestAnimationFrame(draw);
  };
  video.addEventListener("play", () => draw());
  return stream;
}
