import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Scissors, Shield, FileText } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  themeColor: string | null;
  address: string | null;
  phone: string | null;
}

interface SiteLegalPageProps {
  type: "privacy" | "terms";
}

export default function SiteLegalPage({ type }: SiteLegalPageProps) {
  const { slug } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/tenant-by-slug/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTenant(d); })
      .catch(() => {});
  }, [slug]);

  const themeColor = tenant?.themeColor || "#18181b";
  const name = tenant?.name || "Estúdio";
  const address = tenant?.address || "";
  const phone = tenant?.phone || "";
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">

      {/* Navbar simples */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link
            to={`/${slug}`}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors mr-2"
          >
            <ArrowLeft size={14} /> Voltar ao site
          </Link>
          <div className="w-px h-4 bg-zinc-200" />
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt={name} className="h-6 w-6 object-contain rounded" />
          ) : (
            <div className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ backgroundColor: themeColor }}>
              <Scissors size={12} />
            </div>
          )}
          <span className="font-black text-sm text-zinc-800">{name}</span>
        </div>
      </nav>

      {/* Conteúdo */}
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-16">

        {/* Header */}
        <div className="flex items-start gap-4 mb-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-1"
            style={{ backgroundColor: `${themeColor}15` }}
          >
            {type === "privacy"
              ? <Shield size={22} style={{ color: themeColor }} />
              : <FileText size={22} style={{ color: themeColor }} />
            }
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
              {name}
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">
              {type === "privacy" ? "Política de Privacidade" : "Termos de Uso"}
            </h1>
            <p className="text-sm text-zinc-500 mt-2">
              Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="h-px bg-zinc-100 mb-10" />

        {type === "privacy" ? (
          <PrivacyContent name={name} address={address} phone={phone} themeColor={themeColor} />
        ) : (
          <TermsContent name={name} address={address} phone={phone} themeColor={themeColor} />
        )}

        {/* Footer da página */}
        <div className="mt-12 pt-8 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-400">
            © {year} {name} · Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-xs font-bold text-zinc-500">
            {type === "terms" ? (
              <Link to={`/${slug}/privacidade`} className="hover:text-zinc-800 transition-colors">
                Política de Privacidade
              </Link>
            ) : (
              <Link to={`/${slug}/termos`} className="hover:text-zinc-800 transition-colors">
                Termos de Uso
              </Link>
            )}
            <Link to={`/${slug}`} className="hover:text-zinc-800 transition-colors">
              Voltar ao site
            </Link>
            <Link
              to={`/${slug}/agendar`}
              className="px-3 py-1 rounded-lg text-white text-xs font-bold"
              style={{ backgroundColor: themeColor }}
            >
              Agendar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Seção auxiliar ─────────────────────────────────────────────────────────────

function Section({ title, children, themeColor }: { title: string; children: React.ReactNode; themeColor: string }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-black text-zinc-900 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: themeColor }} />
        {title}
      </h2>
      <div className="text-sm text-zinc-600 leading-relaxed space-y-2 pl-3">
        {children}
      </div>
    </section>
  );
}

// ── Política de Privacidade ────────────────────────────────────────────────────

function PrivacyContent({ name, address, phone, themeColor }: { name: string; address: string; phone: string; themeColor: string }) {
  return (
    <div>
      <p className="text-sm text-zinc-600 leading-relaxed mb-8">
        A sua privacidade é importante para nós. Esta Política de Privacidade descreve como <strong>{name}</strong> coleta,
        utiliza e protege as informações que você nos fornece ao utilizar nossos serviços de agendamento online.
      </p>

      <Section title="1. Informações que Coletamos" themeColor={themeColor}>
        <p>Ao utilizar nossa plataforma de agendamento, podemos coletar as seguintes informações:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Nome completo</li>
          <li>Número de telefone (WhatsApp)</li>
          <li>Data de nascimento (opcional)</li>
          <li>Histórico de agendamentos realizados</li>
          <li>Preferências de serviços e profissionais</li>
        </ul>
      </Section>

      <Section title="2. Como Utilizamos as Informações" themeColor={themeColor}>
        <p>As informações coletadas são utilizadas exclusivamente para:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Confirmar e gerenciar seus agendamentos</li>
          <li>Enviar lembretes e confirmações via WhatsApp</li>
          <li>Personalizar o atendimento de acordo com seu histórico</li>
          <li>Enviar mensagens de boas-vindas e promoções (apenas com seu consentimento)</li>
          <li>Melhorar continuamente nossos serviços</li>
        </ul>
      </Section>

      <Section title="3. Compartilhamento de Dados" themeColor={themeColor}>
        <p>
          Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto quando necessário
          para a prestação do serviço (como plataformas de mensagens para envio de confirmações) ou quando exigido por lei.
        </p>
      </Section>

      <Section title="4. Armazenamento e Segurança" themeColor={themeColor}>
        <p>
          Seus dados são armazenados em servidores seguros com acesso restrito. Adotamos medidas técnicas e organizacionais
          adequadas para proteger suas informações contra acesso não autorizado, perda ou alteração.
        </p>
      </Section>

      <Section title="5. Seus Direitos" themeColor={themeColor}>
        <p>De acordo com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem direito a:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Confirmar a existência de tratamento de dados</li>
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos ou incorretos</li>
          <li>Solicitar a exclusão dos seus dados</li>
          <li>Revogar o consentimento a qualquer momento</li>
        </ul>
        <p className="mt-2">Para exercer esses direitos, entre em contato conosco através dos canais abaixo.</p>
      </Section>

      <Section title="6. Cookies e Tecnologias Similares" themeColor={themeColor}>
        <p>
          Nossa plataforma pode utilizar cookies técnicos essenciais para o funcionamento do sistema de agendamento.
          Esses cookies não armazenam informações pessoais identificáveis e são necessários para a navegação.
        </p>
      </Section>

      <Section title="7. Retenção de Dados" themeColor={themeColor}>
        <p>
          Mantemos seus dados pelo período necessário para a prestação dos serviços e cumprimento de obrigações legais.
          Após a solicitação de exclusão, seus dados serão removidos em até 30 dias, exceto quando houver obrigação legal
          de retenção.
        </p>
      </Section>

      <Section title="8. Contato" themeColor={themeColor}>
        <p>Em caso de dúvidas sobre esta Política de Privacidade, entre em contato:</p>
        <div className="mt-2 space-y-1">
          <p><strong>Estabelecimento:</strong> {name}</p>
          {address && <p><strong>Endereço:</strong> {address}</p>}
          {phone && <p><strong>Telefone:</strong> {phone}</p>}
        </div>
      </Section>

      <Section title="9. Alterações nesta Política" themeColor={themeColor}>
        <p>
          Reservamo-nos o direito de atualizar esta Política de Privacidade periodicamente. Alterações significativas
          serão comunicadas através dos nossos canais de atendimento. O uso contínuo dos nossos serviços após
          alterações implica na aceitação da política atualizada.
        </p>
      </Section>
    </div>
  );
}

// ── Termos de Uso ──────────────────────────────────────────────────────────────

function TermsContent({ name, address, phone, themeColor }: { name: string; address: string; phone: string; themeColor: string }) {
  return (
    <div>
      <p className="text-sm text-zinc-600 leading-relaxed mb-8">
        Ao utilizar o sistema de agendamento online de <strong>{name}</strong>, você concorda com os presentes
        Termos de Uso. Leia atentamente antes de realizar seu agendamento.
      </p>

      <Section title="1. Aceitação dos Termos" themeColor={themeColor}>
        <p>
          O acesso e uso da plataforma de agendamento implica na aceitação integral destes Termos de Uso.
          Caso não concorde com algum item, pedimos que não utilize o serviço de agendamento online.
        </p>
      </Section>

      <Section title="2. Sobre o Serviço" themeColor={themeColor}>
        <p>
          O sistema de agendamento online de <strong>{name}</strong> permite que clientes realizem reservas de
          horários para serviços de beleza e estética de forma prática e conveniente, disponível 24 horas por dia.
        </p>
      </Section>

      <Section title="3. Agendamento e Confirmação" themeColor={themeColor}>
        <ul className="list-disc list-inside space-y-1">
          <li>Ao realizar um agendamento, você receberá uma confirmação via WhatsApp.</li>
          <li>O agendamento é pessoal e intransferível.</li>
          <li>Informações incorretas fornecidas são de responsabilidade do cliente.</li>
          <li>Agendamentos estão sujeitos à disponibilidade de horários.</li>
        </ul>
      </Section>

      <Section title="4. Cancelamento e Reagendamento" themeColor={themeColor}>
        <ul className="list-disc list-inside space-y-1">
          <li>Cancelamentos devem ser realizados com antecedência mínima conforme política do estabelecimento.</li>
          <li>Faltas sem aviso prévio podem resultar em restrição para novos agendamentos.</li>
          <li>Reagendamentos estão sujeitos à disponibilidade na agenda.</li>
          <li>O estabelecimento reserva o direito de cancelar agendamentos em casos de força maior.</li>
        </ul>
      </Section>

      <Section title="5. Responsabilidades do Cliente" themeColor={themeColor}>
        <p>O cliente se compromete a:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Fornecer informações verdadeiras e atualizadas no momento do agendamento.</li>
          <li>Comparecer no horário agendado ou avisar com antecedência em caso de impossibilidade.</li>
          <li>Respeitar as normas de conduta do estabelecimento.</li>
          <li>Informar sobre condições de saúde relevantes que possam afetar os serviços.</li>
        </ul>
      </Section>

      <Section title="6. Responsabilidades do Estabelecimento" themeColor={themeColor}>
        <p><strong>{name}</strong> se compromete a:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Prestar os serviços agendados com qualidade e profissionalismo.</li>
          <li>Manter o sigilo das informações pessoais fornecidas.</li>
          <li>Comunicar alterações de horário com a maior antecedência possível.</li>
          <li>Disponibilizar ambiente seguro e adequado para a prestação dos serviços.</li>
        </ul>
      </Section>

      <Section title="7. Propriedade Intelectual" themeColor={themeColor}>
        <p>
          Todo o conteúdo disponível nesta página, incluindo textos, logotipos, imagens e identidade visual,
          é propriedade de <strong>{name}</strong> e está protegido pelas leis de propriedade intelectual.
          É proibida a reprodução sem autorização expressa.
        </p>
      </Section>

      <Section title="8. Limitação de Responsabilidade" themeColor={themeColor}>
        <p>
          O estabelecimento não se responsabiliza por falhas técnicas na plataforma de agendamento que estejam
          fora do seu controle, nem por danos indiretos decorrentes do uso ou impossibilidade de uso do serviço online.
        </p>
      </Section>

      <Section title="9. Legislação Aplicável" themeColor={themeColor}>
        <p>
          Estes Termos de Uso são regidos pela legislação brasileira, em especial pelo Código de Defesa do Consumidor
          (Lei nº 8.078/1990) e pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          Fica eleito o foro da comarca onde se localiza o estabelecimento para resolução de eventuais conflitos.
        </p>
      </Section>

      <Section title="10. Contato" themeColor={themeColor}>
        <p>Para dúvidas, reclamações ou sugestões referentes a estes Termos de Uso:</p>
        <div className="mt-2 space-y-1">
          <p><strong>Estabelecimento:</strong> {name}</p>
          {address && <p><strong>Endereço:</strong> {address}</p>}
          {phone && <p><strong>Telefone:</strong> {phone}</p>}
        </div>
      </Section>

      <Section title="11. Alterações nos Termos" themeColor={themeColor}>
        <p>
          Estes Termos de Uso podem ser atualizados periodicamente. A versão mais recente estará sempre disponível
          nesta página. O uso continuado do serviço após alterações implica na aceitação dos novos termos.
        </p>
      </Section>
    </div>
  );
}
