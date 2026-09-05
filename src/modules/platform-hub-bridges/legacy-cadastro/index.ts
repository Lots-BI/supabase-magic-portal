export type { LegacyCadastroBridgePort } from "@/modules/platform-hub/bridges/ports";
export { createLegacyCadastroBridge, LegacyCadastroBridge } from "./legacy-cadastro.bridge";
export { registerCadastroRecord, registerConnectionScope } from "./in-memory-cadastro.registry";
export { cadastroClientesBridgeStub } from "./stubs/cadastro-clientes.bridge.stub";
