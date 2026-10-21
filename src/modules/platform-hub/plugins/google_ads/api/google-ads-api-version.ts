/**
 * Versão REST usada na coleta e na descoberta de contas.
 * v19 foi descontinuada e o host devolve HTML 404 ("Error 404 (Not Found)!!1").
 * v23 (jan/2026) ainda está na janela suportada; v26 é a latest (out/2026).
 * @see https://developers.google.com/google-ads/api/docs/release-notes
 */
export const GOOGLE_ADS_REST_API_VERSION = "v23";

export function googleAdsBaseUrl(version = GOOGLE_ADS_REST_API_VERSION): string {
  return `https://googleads.googleapis.com/${version}`;
}
