import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { completeHubTikTokOAuth } from "@/modules/platform-hub-admin/hub-admin.server";
import { navigateOAuthError, navigateOAuthRedirect } from "@/components/lotus/platform-hub/oauth-redirect";

const searchSchema = z.object({
  code: z.string().optional(),
  auth_code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/oauth/tiktok/callback")({
  validateSearch: searchSchema,
  component: TikTokOAuthCallbackPage,
});

function TikTokOAuthCallbackPage() {
  const search = Route.useSearch();
  const [message, setMessage] = useState("Processando autenticação TikTok...");

  useEffect(() => {
    if (search.error) {
      const msg = search.error_description ?? search.error;
      if (!navigateOAuthError(msg)) setMessage(msg);
      return;
    }
    const code = search.code ?? search.auth_code;
    if (!code || !search.state) {
      const msg = "Parâmetros OAuth ausentes.";
      if (!navigateOAuthError(msg)) setMessage(msg);
      return;
    }
    void completeHubTikTokOAuth({ data: { code, state: search.state } })
      .then((result) => {
        navigateOAuthRedirect(result.redirectAfter);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Falha no OAuth";
        if (!navigateOAuthError(msg)) setMessage(msg);
      });
  }, [search]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
