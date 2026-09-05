import { notifyOAuthPopupParent } from "./oauth-popup";

/** Navega para redirect interno pós-OAuth (popup ou página cheia). */
export function navigateOAuthRedirect(redirectAfter: string): void {
  if (notifyOAuthPopupParent({ redirectAfter })) return;
  window.location.assign(redirectAfter);
}

/** Reporta falha OAuth ao opener (popup) ou exibe na página de callback. */
export function navigateOAuthError(message: string): boolean {
  return notifyOAuthPopupParent({ error: message });
}
