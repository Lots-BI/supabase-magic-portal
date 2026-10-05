import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LotsBIWordmark } from "@/components/lots/LotsMark";
import { BRAND_NAME, BRAND_URL, brandTitle } from "@/lib/brand";
import { PLATFORM_OWNER_EMAIL } from "@/lib/platform-owner";

const UPDATED_ON = "29 de setembro de 2026";
const GOOGLE_PRIVACY_POLICY_URL = "http://www.google.com/policies/privacy";
const GOOGLE_SECURITY_SETTINGS_URL = "https://security.google.com/settings/security/permissions";
const YOUTUBE_TERMS_URL = "https://www.youtube.com/t/terms";
const GOOGLE_API_USER_DATA_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: brandTitle("Política de privacidade") },
      {
        name: "description",
        content: `Como o ${BRAND_NAME} coleta, usa e compartilha dados pessoais, inclusive dados recebidos do Google e do YouTube.`,
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <article className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-4">
          <LotsBIWordmark size="lg" />
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Política de privacidade
            </h1>
            <p className="text-sm text-muted-foreground">Atualizada em {UPDATED_ON}.</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Esta página explica como o {BRAND_NAME} ({BRAND_URL}) trata dados pessoais de quem
            entra na plataforma e de quem autoriza a conexão de contas de anúncio, analytics e
            vídeo. O texto vale para a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e para
            o uso das APIs do Google, inclusive YouTube.
          </p>
        </header>

        <Section title="1. Quem responde por estes dados">
          <p>
            O {BRAND_NAME} é o serviço operado em {BRAND_URL}. Pedidos sobre privacidade, acesso,
            correção ou exclusão de dados vão para{" "}
            <a className="underline underline-offset-2" href={`mailto:${PLATFORM_OWNER_EMAIL}`}>
              {PLATFORM_OWNER_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="2. O que a plataforma faz">
          <p>
            O {BRAND_NAME} reúne métricas de marketing, o fluxo de aprovação de conteúdo e, quando
            a conta autoriza, a publicação em canais conectados. O acesso é por convite ou pedido
            analisado pela equipe. Cada pessoa vê as marcas ligadas à própria conta.
          </p>
        </Section>

        <Section title="3. Quais dados entram">
          <h3 className="font-display text-base font-semibold">Conta</h3>
          <ul>
            <li>E-mail e senha. A senha fica protegida pelo serviço de autenticação.</li>
            <li>Nome e demais dados que a pessoa informa no cadastro ou no pedido de acesso.</li>
            <li>CPF ou CNPJ, quando o formulário de pedido de acesso pede o documento.</li>
            <li>Papel de acesso e vínculo com organizações e marcas.</li>
          </ul>
          <h3 className="font-display text-base font-semibold">Operação da marca</h3>
          <ul>
            <li>Cadastro de clientes, contatos e diretrizes da marca inseridos pela equipe.</li>
            <li>Textos, arquivos e o status de aprovação dos conteúdos.</li>
            <li>
              Interações de redes da marca, como comentários, quando essa coleta está ligada na
              conexão.
            </li>
          </ul>
          <h3 className="font-display text-base font-semibold">Contas conectadas</h3>
          <p>
            Nada disso é lido antes da pessoa autorizar o acesso na tela da plataforma (Google,
            Meta ou TikTok).
          </p>
          <ul>
            <li>
              <strong>Google Ads.</strong> Leitura de campanhas e métricas de anúncio da conta
              autorizada.
            </li>
            <li>
              <strong>Google Analytics 4.</strong> Leitura das métricas da propriedade escolhida.
            </li>
            <li>
              <strong>YouTube.</strong> Leitura do canal, dos vídeos e do analytics. Envio de
              vídeos que a equipe preparou no {BRAND_NAME} e o responsável autorizou publicar.
            </li>
            <li>
              <strong>Google Business Profile.</strong> Leitura e gestão das métricas do perfil,
              quando essa conexão está ativa.
            </li>
            <li>
              <strong>Meta e Instagram.</strong> Leitura de anúncios, páginas e insights.
              Publicação de conteúdo aprovado. Comentários da marca para o CRM. Mensagens e leads
              só entram se esses recursos estiverem ligados na conexão.
            </li>
            <li>
              <strong>TikTok.</strong> Leitura de métricas de anúncio. Essa conexão não publica no
              perfil.
            </li>
          </ul>
          <h3 className="font-display text-base font-semibold">Registros técnicos</h3>
          <ul>
            <li>
              Data, hora e endereço IP de acesso, quando o provedor de infraestrutura registra esses
              dados para segurança e diagnóstico.
            </li>
            <li>Cookie de sessão para manter o login.</li>
          </ul>
        </Section>

        <Section title="4. Para que usamos">
          <ul>
            <li>Mostrar dashboards e relatórios da marca autorizada.</li>
            <li>Conduzir aprovação e publicação nos canais que a conta conectou.</li>
            <li>Manter o acesso seguro e investigar falha de login ou de sincronização.</li>
            <li>Responder pedido de acesso, suporte e exercício de direitos.</li>
          </ul>
          <p>
            Não vendemos dados pessoais. Não usamos dados recebidos do Google para anunciar o{" "}
            {BRAND_NAME}, decidir crédito, vender a terceiros ou treinar modelos de uso geral.
          </p>
        </Section>

        <Section title="5. Dados do Google e do YouTube">
          <p>O {BRAND_NAME} usa os serviços de API do YouTube e outras APIs do Google.</p>
          <p>
            O uso e a transferência, para qualquer outro aplicativo, de informações recebidas das
            APIs do Google seguem a{" "}
            <a
              className="underline underline-offset-2"
              href={GOOGLE_API_USER_DATA_POLICY_URL}
              rel="noreferrer"
            >
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , inclusive os requisitos de uso limitado (Limited Use).
          </p>
          <p>
            Lots BI&apos;s use and transfer to any other app of information received from Google
            APIs will adhere to the{" "}
            <a
              className="underline underline-offset-2"
              href={GOOGLE_API_USER_DATA_POLICY_URL}
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p>
            A Política de Privacidade do Google está em{" "}
            <a
              className="underline underline-offset-2"
              href={GOOGLE_PRIVACY_POLICY_URL}
              rel="noreferrer"
            >
              {GOOGLE_PRIVACY_POLICY_URL}
            </a>
            . Os Termos de Serviço do YouTube estão em{" "}
            <a className="underline underline-offset-2" href={YOUTUBE_TERMS_URL} rel="noreferrer">
              {YOUTUBE_TERMS_URL}
            </a>
            . Ao conectar um canal do YouTube no {BRAND_NAME}, a pessoa concorda com esses termos
            e com os{" "}
            <Link to="/termos" className="underline underline-offset-2">
              termos de serviço
            </Link>{" "}
            do {BRAND_NAME}.
          </p>
          <p>
            Além de desconectar a conta dentro do {BRAND_NAME}, a pessoa pode revogar o acesso do
            aplicativo na página de segurança do Google:{" "}
            <a
              className="underline underline-offset-2"
              href={GOOGLE_SECURITY_SETTINGS_URL}
              rel="noreferrer"
            >
              {GOOGLE_SECURITY_SETTINGS_URL}
            </a>
            .
          </p>
        </Section>

        <Section title="6. Com quem os dados circulam">
          <ul>
            <li>
              Usuários da mesma organização e da mesma marca, no limite do acesso configurado.
            </li>
            <li>
              Prestadores que hospedam o serviço: Supabase (autenticação, banco e arquivos) e
              Vercel (aplicação). Os tokens de conexão ficam criptografados no banco.
            </li>
            <li>
              Google, Meta e TikTok, somente na chamada das APIs que a conta autorizou.
            </li>
            <li>Autoridade pública, quando a lei exigir.</li>
          </ul>
          <p>
            O {BRAND_NAME} não coloca anúncio de terceiros na plataforma e não autoriza terceiros a
            ler o dispositivo da pessoa para publicidade.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            Usamos cookie de sessão para reconhecer quem está logado. Não usamos cookie de
            publicidade nem ferramenta de audiência de terceiros nesta página ou no login.
          </p>
        </Section>

        <Section title="8. Por quanto tempo">
          <p>
            Os dados ficam enquanto a conta, a marca ou a conexão existirem e houver finalidade de
            operar o serviço. Depois de um pedido de exclusão, apagamos ou anonimizamos o que não
            precisa ser guardado. Registros de acesso que a lei manda conservar, como os do Marco
            Civil da Internet, permanecem pelo prazo legal.
          </p>
        </Section>

        <Section title="9. Como revogar e apagar">
          <ul>
            <li>Desconecte a plataforma na área de conexões do {BRAND_NAME}.</li>
            <li>
              No Google, revogue o acesso em{" "}
              <a
                className="underline underline-offset-2"
                href={GOOGLE_SECURITY_SETTINGS_URL}
                rel="noreferrer"
              >
                {GOOGLE_SECURITY_SETTINGS_URL}
              </a>
              .
            </li>
            <li>
              Para apagar dados já armazenados, escreva para{" "}
              <a className="underline underline-offset-2" href={`mailto:${PLATFORM_OWNER_EMAIL}`}>
                {PLATFORM_OWNER_EMAIL}
              </a>
              . O pedido é atendido, salvo o que a lei obrigar a manter.
            </li>
          </ul>
        </Section>

        <Section title="10. Direitos de quem é titular">
          <p>
            A pessoa pode pedir confirmação do tratamento, acesso, correção, anonimização, exclusão,
            portabilidade, informação sobre com quem os dados foram compartilhados e revogação do
            consentimento. O canal é o e-mail desta página. Também é possível apresentar reclamação
            à Autoridade Nacional de Proteção de Dados.
          </p>
        </Section>

        <Section title="11. Crianças">
          <p>
            O {BRAND_NAME} é uma ferramenta de trabalho para equipes de marketing. Não é dirigido a
            crianças.
          </p>
        </Section>

        <Section title="12. Mudanças desta política">
          <p>
            Quando o uso de dados mudar de forma relevante, esta página é atualizada com nova data.
            O link permanece {BRAND_URL}/privacidade.
          </p>
        </Section>

        <Section title="13. Contato">
          <p>
            Dúvidas ou reclamações sobre privacidade:{" "}
            <a className="underline underline-offset-2" href={`mailto:${PLATFORM_OWNER_EMAIL}`}>
              {PLATFORM_OWNER_EMAIL}
            </a>
            .
          </p>
        </Section>

        <p className="flex flex-wrap gap-4 text-sm">
          <Link to="/termos" className="underline underline-offset-2">
            Termos de serviço
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
