export const HUB_OAUTH_POPUP_MESSAGE = "hub-oauth-complete";

const POPUP_FEATURES = "popup=yes,width=600,height=720,left=120,top=80";
const POPUP_TIMEOUT_MS = 10 * 60 * 1000;

export type HubOAuthPopupResult = {
  redirectAfter: string;
};

type HubOAuthPopupMessage = {
  type: typeof HUB_OAUTH_POPUP_MESSAGE;
  redirectAfter?: string;
  error?: string;
};

function isHubOAuthPopupMessage(data: unknown): data is HubOAuthPopupMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === HUB_OAUTH_POPUP_MESSAGE
  );
}

/** Abre OAuth em popup; fallback para redirect se o browser bloquear. */
export function openHubOAuthPopup(authorizationUrl: string): Promise<HubOAuthPopupResult> {
  const popup = window.open(authorizationUrl, "hub-oauth", POPUP_FEATURES);
  if (!popup) {
    window.location.assign(authorizationUrl);
    return new Promise(() => {});
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error("OAuth expirou. Tente novamente."));
      }
    }, POPUP_TIMEOUT_MS);

    const poll = window.setInterval(() => {
      if (popup.closed && !settled) {
        settled = true;
        cleanup();
        reject(new Error("Login cancelado ou popup fechado antes de concluir."));
      }
    }, 400);

    function cleanup() {
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener("message", onMessage);
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isHubOAuthPopupMessage(event.data)) return;
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }
      if (!event.data.redirectAfter) {
        reject(new Error("OAuth concluído sem destino de retorno."));
        return;
      }
      resolve({ redirectAfter: event.data.redirectAfter });
    }

    window.addEventListener("message", onMessage);
  });
}

/** Callback OAuth em popup: notifica o opener e fecha a janela. */
export function notifyOAuthPopupParent(result: {
  redirectAfter?: string;
  error?: string;
}): boolean {
  const opener = window.opener;
  if (!opener || opener.closed) return false;
  opener.postMessage(
    {
      type: HUB_OAUTH_POPUP_MESSAGE,
      redirectAfter: result.redirectAfter,
      error: result.error,
    },
    window.location.origin,
  );
  window.close();
  return true;
}
