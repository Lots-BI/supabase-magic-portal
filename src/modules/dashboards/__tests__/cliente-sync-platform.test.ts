import { describe, expect, it } from "vitest";
import {
  hubPluginKeyForSync,
  indexCadastroIdsByClienteName,
  isClienteSyncPlatform,
  lookupCadastroId,
} from "../cliente-sync-platform";

describe("hubPluginKeyForSync", () => {
  it("usa instagram_organic para perfil e publicações", () => {
    expect(hubPluginKeyForSync("instagram")).toBe("instagram_organic");
    expect(hubPluginKeyForSync("publicacoes")).toBe("instagram_organic");
  });

  it("espelha a chave do Hub nas demais plataformas", () => {
    expect(hubPluginKeyForSync("meta_ads")).toBe("meta_ads");
    expect(hubPluginKeyForSync("google_ads")).toBe("google_ads");
    expect(hubPluginKeyForSync("ga4")).toBe("ga4");
    expect(hubPluginKeyForSync("tiktok")).toBe("tiktok");
    expect(hubPluginKeyForSync("youtube")).toBe("youtube");
    expect(hubPluginKeyForSync("google_business")).toBe("google_business");
  });

  it("reconhece só as plataformas com coleta manual", () => {
    expect(isClienteSyncPlatform("meta_ads")).toBe(true);
    expect(isClienteSyncPlatform("meta")).toBe(false);
  });
});

describe("lookupCadastroId", () => {
  it("acha o cadastro por nome, caixa e slug", () => {
    const index = indexCadastroIdsByClienteName([
      { id: 24, nome_cliente: "Fernanda Teixeira" },
    ]);
    expect(lookupCadastroId(index, "Fernanda Teixeira")).toBe(24);
    expect(lookupCadastroId(index, "fernanda teixeira")).toBe(24);
    expect(lookupCadastroId(index, "fernanda-teixeira")).toBe(24);
    expect(lookupCadastroId(index, "Outra")).toBeNull();
  });
});
