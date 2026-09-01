import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import {
  type CredentialAccessPort,
  type OAuthTokenBundleV1,
} from "../../_internal/oauth/credential-access.port";
import {
  type MetaOAuthConfigV1,
  META_OAUTH_DEFAULT_SCOPES,
  metaGraphOAuthUrl,
  metaOAuthDialogUrl,
} from "./meta-oauth.config";
import type { MetaDebugTokenResponseV1, MetaOAuthTokenResponseV1 } from "../api/meta-api.types";
import { META_OAUTH_CREDENTIAL_KEY } from "../meta-credential-keys";

export interface MetaOAuthAuthorizationParams {
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}

export interface MetaOAuthExchangeParams {
  connectionId: ConnectionId;
  code: string;
  redirectUri: string;
}

export interface MetaTokenValidationV1 {
  valid: boolean;
  expiresAt?: string;
  scopes?: readonly string[];
  error?: string;
}

/** OAuth Meta desacoplado do Runtime — tokens persistidos no CredentialVault. */
export class MetaOAuthService {
  private readonly graphVersion: string;
  private readonly credentialKey: CredentialKey;
  private readonly defaultScopes: readonly string[];

  constructor(
    private readonly config: MetaOAuthConfigV1,
    private readonly httpClient: HttpClientPort,
    private readonly credentialAccess: CredentialAccessPort,
  ) {
    this.graphVersion = config.graphVersion ?? "v22.0";
    this.credentialKey = config.credentialKey ?? META_OAUTH_CREDENTIAL_KEY;
    this.defaultScopes = config.defaultScopes ?? META_OAUTH_DEFAULT_SCOPES;
  }

  buildAuthorizationUrl(params: MetaOAuthAuthorizationParams): string {
    const scopes = params.scopes ?? this.defaultScopes;
    const url = new URL(metaOAuthDialogUrl(this.graphVersion));
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    url.searchParams.set("scope", scopes.join(","));
    url.searchParams.set("response_type", "code");
    return url.toString();
  }

  async exchangeCodeForToken(params: MetaOAuthExchangeParams): Promise<OAuthTokenBundleV1> {
    const response = await this.httpClient.request(metaGraphOAuthUrl(this.graphVersion), {
      searchParams: {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: params.redirectUri,
        code: params.code,
      },
    });

    const body = await response.json<MetaOAuthTokenResponseV1>();
    const bundle = this.toTokenBundle(body);
    await this.credentialAccess.storeOAuthToken(
      params.connectionId,
      this.credentialKey,
      bundle,
    );
    return bundle;
  }

  async refreshAccessToken(connectionId: ConnectionId): Promise<OAuthTokenBundleV1> {
    const current = await this.credentialAccess.retrieveOAuthToken(
      connectionId,
      this.credentialKey,
    );
    if (!current?.accessToken) {
      throw new Error("Meta refresh requires an existing access token in CredentialVault");
    }

    const response = await this.httpClient.request(metaGraphOAuthUrl(this.graphVersion), {
      searchParams: {
        grant_type: "fb_exchange_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        fb_exchange_token: current.accessToken,
      },
    });

    const body = await response.json<MetaOAuthTokenResponseV1>();
    const bundle = this.toTokenBundle(body, current.scopes);
    await this.credentialAccess.storeOAuthToken(connectionId, this.credentialKey, bundle);
    return bundle;
  }

  async validateAccessToken(accessToken: string): Promise<MetaTokenValidationV1> {
    const response = await this.httpClient.request(
      `https://graph.facebook.com/${this.graphVersion}/debug_token`,
      {
        searchParams: {
          input_token: accessToken,
          access_token: `${this.config.clientId}|${this.config.clientSecret}`,
        },
      },
    );

    const body = await response.json<MetaDebugTokenResponseV1>();
    const expiresAt =
      body.data.expires_at && body.data.expires_at > 0
        ? new Date(body.data.expires_at * 1000).toISOString()
        : undefined;

    return {
      valid: body.data.is_valid,
      expiresAt,
      scopes: body.data.scopes,
      error: body.data.error?.message,
    };
  }

  async revokeConnectionToken(connectionId: ConnectionId): Promise<void> {
    const current = await this.credentialAccess.retrieveOAuthToken(
      connectionId,
      this.credentialKey,
    );
    if (current?.accessToken) {
      await this.httpClient.request(
        `https://graph.facebook.com/${this.graphVersion}/${current.accessToken}/permissions`,
        { method: "DELETE" },
      );
    }
    await this.credentialAccess.deleteCredential(connectionId, this.credentialKey);
  }

  private toTokenBundle(
    body: MetaOAuthTokenResponseV1,
    scopes?: readonly string[],
  ): OAuthTokenBundleV1 {
    const expiresAt =
      body.expires_in && body.expires_in > 0
        ? new Date(Date.now() + body.expires_in * 1000).toISOString()
        : undefined;

    return {
      accessToken: body.access_token,
      tokenType: body.token_type ?? "Bearer",
      expiresAt,
      scopes,
    };
  }
}
