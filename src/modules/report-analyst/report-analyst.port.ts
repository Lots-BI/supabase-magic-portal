export type ReportAnalystTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ReportAnalystCompletion =
  { ok: true; text: string } | { ok: false; code: "not_configured" | "upstream"; message: string };

export interface ReportAnalystPort {
  isConfigured(): boolean;
  complete(input: {
    system: string;
    messages: ReportAnalystTurn[];
  }): Promise<ReportAnalystCompletion>;
}
