import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileText, CheckCircle2 } from "lucide-react";
import logoImg from "../images/system/imagem-agendele.png";

interface PlatformLegalPageProps {
  type: "privacy" | "terms";
}

export default function PlatformLegalPage({ type }: PlatformLegalPageProps) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">
      {/* Navbar simples */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="Agendelle" className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar ao Início
          </Link>
        </div>
      </nav>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-5 py-12 md:py-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12">
          <div className="w-16 h-16 rounded-[24px] bg-amber-500/10 flex items-center justify-center shrink-0">
            {type === "privacy" ? (
              <Shield size={32} className="text-amber-600" />
            ) : (
              <FileText size={32} className="text-amber-600" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-2">
              Plataforma Agendelle
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight leading-tight">
              {type === "privacy" ? "Política de Privacidade" : "Termos de Uso"}
            </h1>
            <p className="text-sm text-zinc-500 mt-3 font-medium">
              Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="h-px bg-zinc-100 mb-12" />

        {/* Texto Legal */}
        <div className="prose prose-zinc max-w-none">
          {type === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </div>

        {/* Footer da página */}
        <div className="mt-20 pt-10 border-t border-zinc-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-sm text-zinc-400 font-medium">
                © {year} Agendelle • Tecnologia para Negócios de Beleza.
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">
                Desenvolvido por Develoi Soluções Digitais
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-zinc-500">
              <Link to={type === "terms" ? "/privacidade" : "/termos"} className="hover:text-amber-600 transition-colors uppercase tracking-wider">
                {type === "terms" ? "Política de Privacidade" : "Termos de Uso"}
              </Link>
              <Link to="/" className="hover:text-zinc-900 transition-colors uppercase tracking-wider">
                Início
              </Link>
              <Link
                to="/assinar"
                className="px-5 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
              >
                Assinar Agora
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-black text-zinc-900 mb-5 flex items-center gap-3">
        <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
        {title}
      </h2>
      <div className="text-[15px] text-zinc-600 leading-relaxed space-y-4 font-medium">
        {children}
      </div>
    </section>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-lg text-zinc-600 leading-relaxed mb-12 font-medium">
        Na Agendelle, levamos a sério a proteção dos seus dados e do seu negócio. Esta Política de Privacidade explica como coletamos, usamos e protegemos as informações de nossos parceiros (lojistas) e como tratamos os dados dos seus clientes finais em conformidade com a LGPD.
      </p>

      <Section title="1. Informações que Coletamos">
        <p>Coletamos informações necessárias para a prestação do serviço SaaS:</p>
        <ul className="list-none space-y-3">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span><strong>Dados do Parceiro:</strong> Nome, e-mail, telefone, CPF/CNPJ e informações do estabelecimento.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span><strong>Dados Financeiros:</strong> Informações de pagamento processadas de forma segura via Stripe.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span><strong>Dados dos Clientes (Operador):</strong> Nome e telefone dos clientes agendados pelo parceiro na plataforma.</span>
          </li>
        </ul>
      </Section>

      <Section title="2. Uso dos Dados">
        <p>Utilizamos os dados coletados exclusivamente para:</p>
        <ul className="list-none space-y-3">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Operar e manter as funcionalidades da agenda e painel administrativo.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Processar pagamentos de assinaturas.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Enviar notificações automáticas de agendamento (WhatsApp/E-mail) solicitadas pelo parceiro.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Suporte técnico e melhorias na plataforma.</span>
          </li>
        </ul>
      </Section>

      <Section title="3. Papéis na LGPD">
        <p><strong>Agendelle como Operadora:</strong> Em relação aos dados dos clientes finais dos salões/barbearias, a Agendelle atua como Operadora, processando dados sob instrução do parceiro.</p>
        <p><strong>Parceiro como Controlador:</strong> O dono do estabelecimento é o Controlador dos dados de seus clientes, sendo responsável por obter o consentimento e gerenciar as solicitações de privacidade de seus usuários.</p>
      </Section>

      <Section title="4. Compartilhamento de Dados">
        <p>Não vendemos dados em hipótese alguma. Compartilhamos informações apenas com provedores de infraestrutura essenciais:</p>
        <ul className="list-none space-y-3">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span><strong>Stripe:</strong> Para processamento de pagamentos seguro.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span><strong>Provedores de Mensageria:</strong> Para envio de notificações de WhatsApp.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span><strong>Hospedagem Cloud:</strong> Servidores seguros onde a plataforma opera.</span>
          </li>
        </ul>
      </Section>

      <Section title="5. Segurança e Retenção">
        <p>Adotamos criptografia de ponta e protocolos de segurança rigorosos. Os dados são mantidos enquanto a assinatura estiver ativa. Após o cancelamento, o parceiro tem 30 dias para exportar seus dados antes da exclusão definitiva.</p>
      </Section>

      <Section title="6. Contato">
        <p>Para questões de privacidade, contate nosso DPO em: <strong>privacidade@agendelle.com.br</strong></p>
      </Section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-lg text-zinc-600 leading-relaxed mb-12 font-medium">
        Bem-vindo à Agendelle. Ao assinar nossa plataforma, você concorda com estes termos que regem o uso do nosso software de gestão e agendamento online para estabelecimentos de beleza.
      </p>

      <Section title="1. O Serviço">
        <p>A Agendelle fornece uma plataforma SaaS (Software as a Service) que permite a gestão de agendas, clientes, profissionais e faturamento para salões, barbearias e estéticas.</p>
      </Section>

      <Section title="2. Assinatura e Pagamentos">
        <p>O acesso é liberado mediante assinatura mensal ou anual conforme o plano escolhido. Os pagamentos são recorrentes e processados via cartão de crédito ou métodos disponíveis no momento da contratação.</p>
        <p>O atraso no pagamento por mais de 7 dias resultará na suspensão temporária do acesso ao painel administrativo.</p>
      </Section>

      <Section title="3. Período de Teste">
        <p>Oferecemos um período de teste gratuito. Após esse prazo, o sistema solicitará a escolha de um plano para continuidade dos serviços. Não há fidelidade; você pode cancelar a qualquer momento.</p>
      </Section>

      <Section title="4. Propriedade dos Dados">
        <p>Todos os dados de clientes e agendamentos inseridos na plataforma pertencem exclusivamente ao Parceiro. A Agendelle garante o acesso e a exportação desses dados conforme solicitado pelo dono da conta.</p>
      </Section>

      <Section title="5. Responsabilidade de Uso">
        <p>O Parceiro é responsável por:</p>
        <ul className="list-none space-y-3">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Manter a confidencialidade de sua senha de acesso.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Garantir que as informações dos serviços e preços no link de agendamento estejam corretas.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Não utilizar a ferramenta para envio de SPAM via integração de mensagens.</span>
          </li>
        </ul>
      </Section>

      <Section title="6. Disponibilidade do Sistema">
        <p>Buscamos manter um uptime de 99,9%. Manutenções programadas serão comunicadas com antecedência. Não nos responsabilizamos por falhas decorrentes de problemas na conexão de internet do usuário ou provedores externos (ex: queda do WhatsApp).</p>
      </Section>

      <Section title="7. Cancelamento">
        <p>O cancelamento pode ser feito a qualquer momento através do painel de configurações. Não há reembolso de mensalidades já pagas, sendo o acesso mantido até o final do período já quitado.</p>
      </Section>

      <Section title="8. Foro">
        <p>Este contrato é regido pelas leis brasileiras. Eventuais disputas serão resolvidas no foro da comarca da sede da empresa proprietária da Agendelle.</p>
      </Section>
    </>
  );
}
