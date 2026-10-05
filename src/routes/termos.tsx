import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LotsBIWordmark } from "@/components/lots/LotsMark";
import { BRAND_NAME, BRAND_URL, brandTitle } from "@/lib/brand";
import { PLATFORM_OWNER_EMAIL } from "@/lib/platform-owner";

const UPDATED_ON = "29 de setembro de 2026";
const YOUTUBE_TERMS_URL = "https://www.youtube.com/t/terms";
const GOOGLE_API_TERMS_URL = "https://developers.google.com/terms";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: brandTitle("Termos de serviço") },
      {
        name: "description",
        content: `Condições de uso do ${BRAND_NAME}, inclusive a conexão com Google, YouTube, Meta e TikTok.`,
      },
    ],
  }),
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <article className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-4">
          <LotsBIWordmark size="lg" />
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Termos de serviço
            </h1>
            <p className="text-sm text-muted-foreground">Atualizados em {UPDATED_ON}.</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Estes termos regem o uso do {BRAND_NAME} ({BRAND_URL}). Ao criar uma conta, entrar ou
            conectar uma plataforma, a pessoa aceita estes termos e a{" "}
            <Link to="/privacidade" className="underline underline-offset-2">
              política de privacidade
            </Link>
            .
          </p>
        </header>

        <Section title="1. O que é o serviço">
          <p>
            O {BRAND_NAME} é uma ferramenta de trabalho para equipes de marketing. Ela reúne
            métricas, o fluxo de aprovação de conteúdo e, quando a conta autoriza, a publicação nos
            canais conectados. O acesso é por convite ou por pedido analisado pela equipe.
          </p>
        </Section>

        <Section title="2. Conta">
          <ul>
            <li>A pessoa guarda o próprio e-mail e a própria senha.</li>
            <li>A atividade feita com essa conta é de responsabilidade de quem entrou.</li>
            <li>
              O acesso pode ser recusado ou encerrado se o convite acabar ou o uso for indevido.
            </li>
          </ul>
        </Section>

        <Section title="3. Contas conectadas">
          <p>
            Google Ads, Google Analytics, YouTube, Google Business Profile, Meta, Instagram e TikTok
            só são consultados depois que alguém com poder sobre aquela conta autoriza a conexão. A
            pessoa confirma que pode conceder esse acesso em nome da marca.
          </p>
          <p>
            Desconectar no {BRAND_NAME} encerra novas consultas e novos envios. O que já foi
            publicado no canal continua no canal, até alguém apagar lá.
          </p>
        </Section>

        <Section title="4. YouTube e APIs do Google">
          <p>O {BRAND_NAME} usa os serviços de API do YouTube e outras APIs do Google.</p>
          <p>
            Ao usar o {BRAND_NAME}, a pessoa concorda em ficar vinculada aos{" "}
            <a className="underline underline-offset-2" href={YOUTUBE_TERMS_URL} rel="noreferrer">
              Termos de Serviço do YouTube
            </a>{" "}
            ({YOUTUBE_TERMS_URL}).
          </p>
          <p>
            By using {BRAND_NAME}, you agree to be bound by the{" "}
            <a className="underline underline-offset-2" href={YOUTUBE_TERMS_URL} rel="noreferrer">
              YouTube Terms of Service
            </a>
            .
          </p>
          <p>
            O uso das APIs do Google também segue os{" "}
            <a
              className="underline underline-offset-2"
              href={GOOGLE_API_TERMS_URL}
              rel="noreferrer"
            >
              Termos de Serviço das APIs do Google
            </a>
            .
          </p>
          <p>
            Vídeo enviado ao YouTube pelo {BRAND_NAME} é publicado como público. Só envie material
            que possa ficar visível para qualquer pessoa.
          </p>
        </Section>

        <Section title="5. Conteúdo">
          <ul>
            <li>
              Textos, imagens e vídeos colocados no {BRAND_NAME} continuam de quem os criou ou da
              marca que representam.
            </li>
            <li>
              Quem envia o material confirma que tem direito de usá-lo e de autorizar a publicação
              no canal conectado.
            </li>
            <li>
              A publicação só segue depois do fluxo de aprovação da marca. O {BRAND_NAME} não
              escolhe sozinho o que entra no ar.
            </li>
          </ul>
        </Section>

        <Section title="6. Números e disponibilidade">
          <p>
            Os dashboards mostram o que as APIs oficiais devolvem. O {BRAND_NAME} não completa
            lacuna com número inventado. Uma plataforma pode atrasar, limitar ou interromper a
            consulta. O serviço pode ser atualizado, pausado ou ter uma função retirada.
          </p>
        </Section>

        <Section title="7. Uso aceitável">
          <ul>
            <li>Não use a conta de outra pessoa sem autorização.</li>
            <li>Não conecte uma conta de anúncio ou um canal que você não pode administrar.</li>
            <li>Não publique conteúdo ilegal nem material de quem não autorizou.</li>
          </ul>
        </Section>

        <Section title="8. Privacidade">
          <p>
            O tratamento de dados pessoais está na{" "}
            <Link to="/privacidade" className="underline underline-offset-2">
              política de privacidade
            </Link>
            . Estes termos e aquela política valem juntos.
          </p>
        </Section>

        <Section title="9. Mudanças">
          <p>
            Quando estes termos mudarem, a data no topo desta página muda. Seguir usando o{" "}
            {BRAND_NAME} depois da atualização significa aceitar a versão nova. O link permanece{" "}
            {BRAND_URL}/termos.
          </p>
        </Section>

        <Section title="10. Lei aplicável">
          <p>Estes termos se regem pelas leis da República Federativa do Brasil.</p>
        </Section>

        <Section title="11. Contato">
          <p>
            Dúvidas sobre estes termos:{" "}
            <a className="underline underline-offset-2" href={`mailto:${PLATFORM_OWNER_EMAIL}`}>
              {PLATFORM_OWNER_EMAIL}
            </a>
            .
          </p>
        </Section>

        <p className="flex flex-wrap gap-4 text-sm">
          <Link to="/privacidade" className="underline underline-offset-2">
            Política de privacidade
          </Link>
          <Link to="/" className="underline underline-offset-2">
            Ir para o início
          </Link>
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
