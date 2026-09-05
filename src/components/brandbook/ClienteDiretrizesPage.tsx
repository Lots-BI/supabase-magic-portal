import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText } from "lucide-react";
import { getDiretrizesSignedUrl } from "@/lib/diretrizes.functions";
import { DiretrizesPdfViewer } from "./DiretrizesPdfViewer";
import { EmptyState } from "@/components/lotus/EmptyState";

export function ClienteDiretrizesPage({ cadastroId }: { cadastroId: number | null }) {
  const getUrl = useServerFn(getDiretrizesSignedUrl);
  const { data, isLoading, error } = useQuery({
    queryKey: ["diretrizes", cadastroId],
    enabled: cadastroId != null,
    queryFn: () => getUrl({ data: { cadastroClienteId: cadastroId! } }),
  });

  if (!cadastroId) {
    return (
      <EmptyDiretrizes message="Não foi possível identificar a conta para abrir as diretrizes." />
    );
  }

  if (isLoading) {
    return <div className="lotus-skeleton h-[calc(100dvh-3.5rem)] w-full" />;
  }

  if (error) {
    return (
      <EmptyDiretrizes
        message={error instanceof Error ? error.message : "Não foi possível carregar o PDF."}
      />
    );
  }

  if (!data) {
    return (
      <EmptyDiretrizes message="A agência ainda não publicou as diretrizes da marca desta conta." />
    );
  }

  return <DiretrizesPdfViewer url={data.url} title={data.fileName} />;
}

function EmptyDiretrizes({ message }: { message: string }) {
  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="lotus-surface mx-auto max-w-lg">
        <EmptyState icon={FileText} title="Diretrizes da Marca" description={message} />
      </div>
    </div>
  );
}
