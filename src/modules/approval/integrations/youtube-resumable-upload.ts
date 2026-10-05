export const YOUTUBE_VIDEO_MAX_BYTES = 64 * 1024 * 1024;

export async function uploadYouTubeVideo(input: {
  accessToken: string;
  title: string;
  description: string;
  mimeType: string;
  bytes: Uint8Array;
  fetchImpl?: typeof fetch;
}): Promise<{ videoId: string }> {
  if (input.bytes.byteLength === 0) throw new Error("O vídeo está vazio.");
  if (input.bytes.byteLength > YOUTUBE_VIDEO_MAX_BYTES) {
    throw new Error("O vídeo passa de 64 MB. Reduza o arquivo antes de publicar.");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const start = await fetchImpl(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(input.bytes.byteLength),
        "X-Upload-Content-Type": input.mimeType,
      },
      body: JSON.stringify({
        snippet: {
          title: input.title.slice(0, 100),
          description: input.description.slice(0, 5000),
        },
        status: { privacyStatus: "public" },
      }),
    },
  );
  if (!start.ok) {
    throw new Error(
      `YouTube recusou o envio (${start.status}). Reconecte o canal com permissão de upload.`,
    );
  }
  const location = start.headers.get("location");
  if (!location) throw new Error("YouTube não devolveu o endereço de upload.");
  const put = await fetchImpl(location, {
    method: "PUT",
    headers: {
      "Content-Type": input.mimeType,
      "Content-Length": String(input.bytes.byteLength),
    },
    body: input.bytes,
  });
  if (!put.ok) {
    throw new Error(`YouTube não concluiu o vídeo (${put.status}).`);
  }
  const body = (await put.json()) as { id?: string };
  if (!body.id) throw new Error("YouTube não devolveu o id do vídeo.");
  return { videoId: body.id };
}
