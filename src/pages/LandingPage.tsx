import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Smartphone,
  Bell,
  BarChart3,
  Users,
  CreditCard,
  Zap,
  Check,
  Clock,
  TrendingUp,
  Sparkles,
  Play,
  Globe,
  Package,
  DollarSign,
  Star,
  MessageSquare,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import "./LandingPage.css";

import logoImg          from "../images/system/imagem-agendele.png";
import faviconImg       from "../images/system/logo-favicon.png";
import mockupApp        from "../images/system/agendelle_mockup_dashboard.png";
import mockupDashboard  from "../../public/mockup-app-agendelle.png";

export default function LandingPage() {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [plans, setPlans]         = useState<any[]>([]);
  const [loadingPlans, setLoading] = useState(true);
  const [contacts, setContacts]   = useState<any[]>([]);
  const navigate = useNavigate();

  /* navbar scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* scroll reveal */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lp-in"); }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".lp-rv").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [plans]); // Re-run when plans change to observe new cards

  /* fetch plans */
  useEffect(() => {
    apiFetch("/api/auth/plans")
      .then(r => r.json())
      .then(data => {
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch(e => console.error("Error fetching plans:", e))
      .finally(() => setLoading(false));

    apiFetch("/api/public/platform-contacts")
      .then(r => r.json())
      .then(data => setContacts(data))
      .catch(() => {});
  }, []);

  /* smooth scroll */
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getContact = (type: "sales" | "support") => {
    const primary = contacts.find(c => c.type === type && c.isPrimary);
    if (primary) return primary.phone;
    const first = contacts.find(c => c.type === type);
    return first?.phone || "5511999999999"; // Fallback
  };

  const renderCell = (val: boolean | string) => {
    if (val === true)  return <span className="lp-cmp-yes"><Check size={15} /></span>;
    if (val === false) return <span className="lp-cmp-no"><X size={15} /></span>;
    return <span className="lp-cmp-partial">{val}</span>;
  };

  const openWpp = (type: "sales" | "support") => {
    const phone = getContact(type);
    const msg = type === "sales" 
      ? "Olá! Gostaria de saber mais informações sobre as assinaturas do Agendelle e como funciona o sistema."
      : "Olá! Gostaria de suporte técnico para minha conta no Agendelle.";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="lp-root">

      {/* ══ NAVBAR ══════════════════════════════════ */}
      <nav className={`lp-nav ${scrolled ? "lp-scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <a href="/" className="lp-nav-logo">
            <img src={logoImg} alt="Agendelle" />
          </a>
          <ul className="lp-nav-links">
            <li><a href="#recursos"      onClick={e => { e.preventDefault(); scrollTo("#recursos"); }}>Recursos</a></li>
            <li><a href="#como-funciona" onClick={e => { e.preventDefault(); scrollTo("#como-funciona"); }}>Como Funciona</a></li>
            <li><a href="#precos"        onClick={e => { e.preventDefault(); scrollTo("#precos"); }}>Preços</a></li>
            <li><a href="#depoimentos"   onClick={e => { e.preventDefault(); scrollTo("#depoimentos"); }}>Depoimentos</a></li>
            <li><a href="/blog"          onClick={e => { e.preventDefault(); navigate("/blog"); }}>Blog</a></li>
          </ul>
          <div className="lp-nav-cta">
            <button className="lp-btn lp-btn-ghost" onClick={() => navigate("/login")}>Entrar</button>
            <button className="lp-btn lp-btn-primary" onClick={() => openWpp("sales")}>Falar com vendas →</button>
          </div>
          <button className={`lp-hamburger ${menuOpen ? "lp-active" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`lp-mob-menu ${menuOpen ? "lp-open" : ""}`}>
        <a href="#recursos"      onClick={() => scrollTo("#recursos")}>Recursos</a>
        <a href="#como-funciona" onClick={() => scrollTo("#como-funciona")}>Como Funciona</a>
        <a href="#precos"        onClick={() => scrollTo("#precos")}>Preços</a>
        <a href="#depoimentos"   onClick={() => scrollTo("#depoimentos")}>Depoimentos</a>
        <a href="/blog"          onClick={() => navigate("/blog")}>Blog</a>
        <button className="lp-btn lp-btn-ghost"   onClick={() => navigate("/login")}>Entrar</button>
        <button className="lp-btn lp-btn-primary" onClick={() => openWpp("sales")}>Falar com vendas →</button>
      </div>

      {/* ══ HERO ════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
        <div className="lp-container">
          <div className="lp-hero-inner">

            {/* Left */}
            <div>
              <div className="lp-hero-badge">
                <span className="lp-tag">✨ Novo</span>
                Versão 2.0 com Gestão Inteligente
              </div>
              <h1>
                A sua <span className="lp-g">agenda inteligente</span><br />
                e elegante para o seu<br />negócio de beleza
              </h1>
              <p className="lp-hero-sub">
                Agendelle une organização inteligente com elegância — o sistema perfeito para salões e barbearias que querem crescer com profissionalismo.
              </p>
              <div className="lp-hero-actions">
                <button className="lp-btn lp-btn-primary" onClick={() => navigate("/login")}>
                  <Sparkles size={18} /> Solicitar teste de 30 dias
                </button>
                <button className="lp-btn lp-btn-ghost" onClick={() => scrollTo("#como-funciona")}>
                  <Play size={18} /> Ver como funciona
                </button>
              </div>
              <div className="lp-hero-trust">
                <div className="lp-avs">
                  <span className="lp-av lp-av1">MG</span>
                  <span className="lp-av lp-av2">JL</span>
                  <span className="lp-av lp-av3">RF</span>
                  <span className="lp-av lp-av4">CS</span>
                </div>
                <div className="lp-trust-text">
                  <strong>+2.800 negócios</strong> já confiam<br />na Agendelle todo dia
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="lp-hero-visual lp-af">
              <div className="lp-hero-card">
                <div className="lp-hero-img">
                  <img src={logoImg} alt="Agendelle — Agendamentos Inteligentes" />
                </div>
              </div>
              <div className="lp-float-card lp-fc-top lp-afb">
                <div className="lp-fc-row">
                  <div className="lp-fc-ico">📅</div>
                  <div>
                    <div className="lp-fc-lbl">Agendamentos hoje</div>
                    <div className="lp-fc-val">38 confirmados</div>
                    <div className="lp-fc-sub">↑ +12 vs ontem</div>
                  </div>
                </div>
              </div>
              <div className="lp-float-card lp-fc-bot">
                <div className="lp-fc-lbl">Receita do mês 💰</div>
                <div className="lp-fc-val lp-g" style={{fontSize:"1.2rem"}}>R$ 18.430</div>
                <div className="lp-fc-sub">↑ +38% esse mês</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ LOGOS BAR ═══════════════════════════════ */}
      <section className="lp-logos">
        <div className="lp-container">
          <p className="lp-logos-label">Usado por profissionais de todo o Brasil</p>
          <div className="lp-logos-inner">
            {["Barbearias","Salões","Studios de Beleza","Spas","Barbearia Premium","Estéticas"].map((item, i, arr) => (
              <span key={item} style={{display:"flex",alignItems:"center"}}>
                <span className="lp-logo-pill">{item}</span>
                {i < arr.length - 1 && <span className="lp-logo-sep">·</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════ */}
      <section className="lp-stats">
        <div className="lp-container">
          <div className="lp-stats-grid">
            {[
              { num: "2.800+", lbl: "Estabelecimentos ativos" },
              { num: "1,2M+",  lbl: "Agendamentos realizados" },
              { num: "98%",    lbl: "Taxa de satisfação" },
              { num: "+40%",   lbl: "Aumento médio de receita" },
            ].map((s, i) => (
              <div key={s.num} className={`lp-stat lp-rv lp-d${i}`}>
                <div className="lp-stat-num lp-g">{s.num}</div>
                <div className="lp-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════ */}
      <section className="lp-features" id="recursos">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Recursos</div>
            <h2 className="lp-sec-title lp-rv lp-d1">Tudo que você precisa<br /><span className="lp-g">em um só lugar</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Uma plataforma completa para gerenciar, crescer e encantar seus clientes — com tecnologia elegante e fácil de usar.</p>
          </div>
          <div className="lp-feat-grid">
            {[
              { ico:<Smartphone />, cls:"lp-fi1", title:"Agendamento Online 24/7",       desc:"Link personalizado da sua marca. Clientes agendam pelo celular a qualquer hora, com confirmação automática e fila de espera inteligente." },
              { ico:<Globe />,      cls:"lp-fi2", title:"Site Próprio em 5 Minutos",      desc:"Cada profissional tem seu próprio site com serviços, fotos, equipe e tema personalizado. Pronto para compartilhar no Instagram em minutos — sem programador." },
              { ico:<CreditCard />, cls:"lp-fi3", title:"Carrinho de Vendas Online",      desc:"Clientes adicionam serviços e produtos ao carrinho e finalizam direto no site do estabelecimento. Venda online sem precisar de loja separada." },
              { ico:<Users />,      cls:"lp-fi4", title:"Comissões por Profissional",     desc:"Defina comissões em percentual ou valor fixo por serviço e por profissional. Relatórios automáticos de pagamento no fechamento do período." },
              { ico:<BarChart3 />,  cls:"lp-fi5", title:"Fluxo de Caixa e Relatórios",   desc:"Dashboard financeiro completo: faturamento diário, ticket médio, serviços mais lucrativos, horários de pico e desempenho por profissional." },
              { ico:<Star />,       cls:"lp-fi6", title:"Clube de Assinaturas",           desc:"Crie planos mensais com créditos de serviços. Clientes assinantes garantem receita recorrente e voltam mais vezes ao seu estabelecimento." },
            ].map((f, i) => (
              <div key={f.title} className={`lp-feat-card lp-rv lp-d${i}`}>
                <div className={`lp-feat-ico ${f.cls}`}>{f.ico}</div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════ */}
      <section className="lp-how" id="como-funciona">
        <div className="lp-container">
          <div className="lp-how-inner">
            <div>
              <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Como funciona</div>
              <h2 className="lp-sec-title lp-rv lp-d1">Simples como<br /><span className="lp-g">deve ser</span></h2>
              <p className="lp-sec-sub lp-rv lp-d2" style={{marginBottom:0}}>Comece em minutos. Sem treinamento técnico, sem complicação — só resultados.</p>
              <div className="lp-how-steps lp-rv lp-d3">
                {[
                  { n:"1", title:"Solicite seu acesso",      desc:"Cadastre seu estabelecimento em menos de 2 minutos. Adicione seus serviços, profissionais e horários de atendimento." },
                  { n:"2", title:"Compartilhe seu link",        desc:"Receba um link personalizado para o seu negócio. Adicione na bio do Instagram, WhatsApp ou no seu site — pronto." },
                  { n:"3", title:"Gerencie tudo em um app",    desc:"Sua agenda se preenche automaticamente. Você acompanha pelo app, recebe notificações e foca no que importa." },
                ].map(s => (
                  <div key={s.n} className="lp-how-step">
                    <div className="lp-step-num">{s.n}</div>
                    <div>
                      <div className="lp-step-title">{s.title}</div>
                      <div className="lp-step-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-how-visual lp-rv lp-d2">
              <div className="lp-hv-header">
                <div className="lp-hv-title">📅 Agenda — Abril 2026</div>
                <div className="lp-hv-badge">8 profissionais</div>
              </div>
              <div className="lp-cal-grid">
                {["D","S","T","Q","Q","S","S"].map(h => <div key={h+Math.random()} className="lp-cal-h">{h}</div>)}
                <div className="lp-cal-d lp-cal-e" />
                {[
                  {d:"1",c:"lp-cal-busy"},{d:"2",c:"lp-cal-booked"},{d:"3",c:"lp-cal-booked"},
                  {d:"4",c:""},{d:"5",c:"lp-cal-booked"},{d:"6",c:"lp-cal-busy"},
                  {d:"7",c:""},{d:"8",c:"lp-cal-booked"},{d:"9",c:"lp-cal-booked"},
                  {d:"10",c:""},{d:"11",c:"lp-cal-today"},{d:"12",c:"lp-cal-booked"},
                  {d:"13",c:"lp-cal-busy"},{d:"14",c:""},{d:"15",c:"lp-cal-booked"},
                ].map((day,i) => <div key={i} className={`lp-cal-d ${day.c}`}>{day.d}</div>)}
              </div>
              <div className="lp-apt-list">
                {[
                  { name:"Lucas Mendes",    service:"Corte + Barba",        time:"09:00", color:"#FF7A2F" },
                  { name:"Ana Paula Souza", service:"Escova Premium",       time:"10:30", color:"#FF3D7F" },
                  { name:"Carlos Rocha",   service:"Tratamento Capilar",    time:"14:00", color:"#7C3AED" },
                ].map(a => (
                  <div key={a.name} className="lp-apt">
                    <div className="lp-apt-dot" style={{background:a.color}} />
                    <div>
                      <div className="lp-apt-name">{a.name}</div>
                      <div className="lp-apt-service">{a.service}</div>
                    </div>
                    <div className="lp-apt-time">{a.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ MOCKUP SHOWCASE ════════════════════════ */}
      <section className="lp-mockup">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Veja em ação</div>
            <h2 className="lp-sec-title lp-rv lp-d1">No celular ou no computador,<br /><span className="lp-g">tudo na palma da mão</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Acesse de qualquer lugar — app mobile para o dia a dia e dashboard completo no computador para a gestão do negócio.</p>
          </div>
          <div className="lp-mockup-grid lp-rv lp-d2">

            {/* Dashboard desktop */}
            <div className="lp-mockup-desktop">
              <div className="lp-mockup-label">
                <span className="lp-mockup-dot lp-mockup-dot-purple" />
                Dashboard — Gestão completa no computador
              </div>
              <div className="lp-mockup-desktop-frame">
                <div className="lp-mockup-browser-bar">
                  <span /><span /><span />
                  <div className="lp-mockup-url">agendelle.com.br/admin</div>
                </div>
                <img src={mockupApp} alt="Dashboard Agendelle — Gestão completa" className="lp-mockup-desktop-img" />
              </div>
            </div>

            {/* App mobile */}
            <div className="lp-mockup-mobile">
              <div className="lp-mockup-label">
                <span className="lp-mockup-dot lp-mockup-dot-orange" />
                App — Controle na palma da mão
              </div>
              <div className="lp-mockup-phone-wrap">
                <img src={mockupDashboard} alt="App Agendelle — Mobile" className="lp-mockup-phone-img" />
              </div>
            </div>

          </div>

          {/* Feature pills abaixo */}
          <div className="lp-mockup-pills lp-rv lp-d3">
            {[
              "📅 Agenda em tempo real",
              "💰 Faturamento do dia",
              "👥 Gestão de equipe",
              "📦 Controle de estoque",
              "💬 WhatsApp integrado",
              "⭐ Clube de assinaturas",
            ].map(pill => (
              <span key={pill} className="lp-mockup-pill">{pill}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BENEFITS ════════════════════════════════ */}
      <section className="lp-ben">
        <div className="lp-container">
          <div className="lp-ben-inner">

            {/* Visual */}
            <div className="lp-ben-visual lp-rv">
              <div className="lp-rev-card">
                <div className="lp-rev-header">
                  <div className="lp-rev-title">Visão financeira</div>
                  <div className="lp-rev-period">Últimos 6 meses</div>
                </div>
                <div className="lp-rev-big lp-g">R$ 24.890</div>
                <div className="lp-rev-change">↑ +38% comparado ao período anterior</div>
                <div className="lp-rev-bars">
                  {["lp-rb-a","lp-rb-b","lp-rb-c","lp-rb-d","lp-rb-e","lp-rb-f"].map(c => (
                    <div key={c} className={`lp-rev-bar ${c}`} />
                  ))}
                </div>
                <div className="lp-rev-legend">
                  {["Nov","Dez","Jan","Fev","Mar","Abr"].map(m => <span key={m}>{m}</span>)}
                </div>
                <div className="lp-rev-metrics">
                  <div className="lp-rev-metric">
                    <div className="lp-rm-val lp-g">312</div>
                    <div className="lp-rm-lbl">Agendamentos</div>
                  </div>
                  <div className="lp-rev-metric">
                    <div className="lp-rm-val lp-g">R$ 79</div>
                    <div className="lp-rm-lbl">Ticket médio</div>
                  </div>
                </div>
                <div className="lp-ben-float">
                  <div className="lp-bf-lbl">Sistema online</div>
                  <div className="lp-bf-val"><span className="lp-bf-dot" />Ativo agora</div>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="lp-rv lp-d2">
              <div className="lp-chip"><span className="lp-chip-dot" />Resultados reais</div>
              <h2 className="lp-sec-title">Sua agenda cheia,<br /><span className="lp-g">seu negócio crescendo</span></h2>
              <p className="lp-sec-sub">Deixe de usar papel ou grupos de WhatsApp para agendar. Com a Agendelle, tudo é automático, profissional e elegante.</p>
              <ul className="lp-ben-list">
                {[
                  { ico:<TrendingUp size={20} />, cls:"lp-bi1", title:"Reduza faltas em até 70%",    desc:"Lembretes automáticos via WhatsApp, SMS e e-mail garantem que seus clientes apareçam." },
                  { ico:<Clock size={20} />,      cls:"lp-bi2", title:"Economize 3h por dia",         desc:"Chega de responder mensagem para confirmar horário. Tudo acontece automaticamente." },
                  { ico:<TrendingUp size={20} />, cls:"lp-bi3", title:"Aumente o ticket médio",        desc:"Sugira serviços complementares no momento do agendamento e venda mais sem esforço." },
                  { ico:<Sparkles size={20} />,   cls:"lp-bi4", title:"Imagem profissional imediata",  desc:"Seu cliente percebe a diferença na hora — confirmação bonita, elegante e confiável." },
                ].map(b => (
                  <li key={b.title} className="lp-ben-item">
                    <div className={`lp-ben-ico ${b.cls}`}>{b.ico}</div>
                    <div className="lp-ben-text">
                      <strong>{b.title}</strong>
                      <span>{b.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ══ FULL FEATURES ═══════════════════════════ */}
      <section className="lp-allfeat" id="tudo-incluido">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Tudo incluso</div>
            <h2 className="lp-sec-title lp-rv lp-d1">Uma plataforma completa.<br /><span className="lp-g">Nenhuma ferramenta extra.</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Tudo que um salão ou barbearia precisa para crescer, organizar e fidelizar — em um único sistema.</p>
          </div>
          <div className="lp-allfeat-grid">
            {[
              {
                icon: <Smartphone size={22} />,
                color: "lp-fi1",
                title: "Agenda & Agendamento",
                items: [
                  "Agendamento online 24/7 pelo celular",
                  "Link personalizado da sua marca",
                  "Agenda individual por profissional",
                  "Agendamentos recorrentes e multi-sessão",
                  "Fila de espera automática (PAT)",
                  "Horários e dias de fechamento por profissional",
                ],
              },
              {
                icon: <MessageSquare size={22} />,
                color: "lp-fi2",
                title: "WhatsApp & Comunicação",
                items: [
                  "Confirmação automática via WhatsApp",
                  "Lembrete 24h antes do horário",
                  "Lembrete 60 minutos antes",
                  "Mensagem de aniversário do cliente",
                  "Notificação ao profissional de novo agendamento",
                  "Templates de mensagem personalizáveis",
                ],
              },
              {
                icon: <DollarSign size={22} />,
                color: "lp-fi3",
                title: "Financeiro & Caixa",
                items: [
                  "Fluxo de caixa diário e mensal",
                  "Relatório de faturamento por período",
                  "Formas de pagamento (Pix, cartão, dinheiro)",
                  "Comissões por profissional e por serviço",
                  "Relatório de lucratividade e custos",
                  "Exportação de dados financeiros",
                ],
              },
              {
                icon: <Users size={22} />,
                color: "lp-fi4",
                title: "Equipe & Comissões",
                items: [
                  "Comissão em percentual ou valor fixo",
                  "Comissão diferente por serviço e profissional",
                  "Relatório de pagamento por profissional",
                  "Performance individual (receita, ticket, agendamentos)",
                  "Horários de trabalho individuais",
                  "Permissões de acesso por função",
                ],
              },
              {
                icon: <Globe size={22} />,
                color: "lp-fi5",
                title: "Site Próprio & Carrinho",
                items: [
                  "Site profissional criado em 5 minutos",
                  "URL personalizada da sua marca",
                  "Vitrine de serviços e produtos com fotos",
                  "Carrinho de vendas online integrado",
                  "Tema e cores personalizáveis",
                  "Pronto para compartilhar no Instagram",
                ],
              },
              {
                icon: <Star size={22} />,
                color: "lp-fi6",
                title: "Fidelização & Assinaturas",
                items: [
                  "Clube de assinaturas com créditos de serviços",
                  "Planos mensais, trimestrais e anuais",
                  "Receita recorrente garantida",
                  "Histórico completo do cliente",
                  "Controle de créditos utilizados",
                  "Convite automático de retorno",
                ],
              },
            ].map((cat, i) => (
              <div key={cat.title} className={`lp-allfeat-card lp-rv lp-d${i % 4}`}>
                <div className={`lp-feat-ico ${cat.color}`} style={{ marginBottom: 16 }}>{cat.icon}</div>
                <h3 className="lp-allfeat-title">{cat.title}</h3>
                <ul className="lp-allfeat-list">
                  {cat.items.map(item => (
                    <li key={item}><span className="lp-ck lp-ck-y">✓</span>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON TABLE ════════════════════════ */}
      <section className="lp-compare">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Comparativo</div>
            <h2 className="lp-sec-title lp-rv lp-d1">Por que escolher<br /><span className="lp-g">o Agendelle?</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Veja como o Agendelle se compara com outras opções do mercado para salões e barbearias.</p>
          </div>
          <div className="lp-cmp-wrap lp-rv lp-d2">
            {/* cabeçalho só mobile */}
            <div className="lp-cmp-mobile-header">
              <div className="lp-cmp-mh-feat">Funcionalidade</div>
              <div className="lp-cmp-mh-col ag">Agendelle</div>
              <div className="lp-cmp-mh-col other">Conc. A</div>
              <div className="lp-cmp-mh-col other">Conc. B</div>
            </div>
            <table className="lp-cmp-table">
              <thead>
                <tr>
                  <th className="lp-cmp-feature">Funcionalidade</th>
                  <th className="lp-cmp-agendelle">
                    <div className="lp-cmp-logo-cell">
                      <span className="lp-cmp-badge-winner">★ Agendelle</span>
                    </div>
                  </th>
                  <th className="lp-cmp-other">Concorrente A</th>
                  <th className="lp-cmp-other">Concorrente B</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feat: "Agendamento online com link personalizado",        ag: true,  a: true,      b: true    },
                  { feat: "Site próprio do profissional (em 5 minutos)",     ag: true,  a: false,     b: false   },
                  { feat: "Carrinho de vendas online com produtos",          ag: true,  a: false,     b: false   },
                  { feat: "Lembretes automáticos via WhatsApp",              ag: true,  a: true,      b: "parcial" },
                  { feat: "Fluxo de caixa e relatórios financeiros",         ag: true,  a: true,      b: false   },
                  { feat: "Comissões por profissional e por serviço",        ag: true,  a: true,      b: false   },
                  { feat: "Controle de estoque com movimentações",           ag: true,  a: false,     b: false   },
                  { feat: "Clube de assinaturas com créditos",               ag: true,  a: "parcial", b: false   },
                  { feat: "Histórico completo e perfil do cliente",          ag: true,  a: true,      b: true    },
                  { feat: "Agenda individual por profissional",              ag: true,  a: true,      b: true    },
                  { feat: "Fila de espera / PAT (terminal de atendimento)",  ag: true,  a: false,     b: false   },
                  { feat: "Agendamentos recorrentes e multi-sessão",         ag: true,  a: false,     b: false   },
                  { feat: "Permissões de acesso por função",                 ag: true,  a: "parcial", b: false   },
                  { feat: "Notificação ao profissional via WhatsApp",        ag: true,  a: false,     b: false   },
                  { feat: "Teste gratuito de 30 dias",                       ag: true,  a: "5 dias",  b: false   },
                ].map((row, i) => (
                  <tr key={row.feat} className={i % 2 === 0 ? "lp-cmp-row-even" : ""}>
                    <td className="lp-cmp-feat-cell">{row.feat}</td>
                    <td className="lp-cmp-ag-cell">{renderCell(row.ag)}</td>
                    <td className="lp-cmp-other-cell">{renderCell(row.a)}</td>
                    <td className="lp-cmp-other-cell">{renderCell(row.b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lp-cmp-disclaimer lp-rv lp-d3">* Comparativo baseado em informações públicas dos sites dos concorrentes. Atualizado em 2026.</p>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════ */}
      <section className="lp-pricing" id="precos">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Planos</div>
            <h2 className="lp-sec-title lp-rv lp-d1">O plano certo para<br /><span className="lp-g">cada momento</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Faça um teste de 30 dias e comprove o valor. Cancele quando quiser — sem contratos ou surpresas.</p>
          </div>
          <div className="lp-price-grid">
            {loadingPlans ? (
              <div className="col-span-full py-12 text-center text-zinc-400 font-medium">Carregando planos...</div>
            ) : plans.length > 0 ? (
              plans
                .sort((a, b) => Number(a.price) - Number(b.price))
                .map((p, idx) => {
                  let features = [];
                  try { features = JSON.parse(p.features || "[]"); } catch(e) { features = []; }
                  const isHot = p.name === "Pro" || p.is_popular || p.isPopular;

                return (
                  <div key={p.id} className={`lp-price-card ${isHot ? "lp-hot" : ""} lp-rv lp-d${idx * 2}`}>
                    {isHot && <div className="lp-hot-badge">★ Mais popular</div>}
                    <div className="lp-pname">{p.name}</div>
                    <div className="lp-pamount">
                      <span className="lp-pcur">R$</span>
                      <span className={`lp-pnum ${isHot ? "lp-g" : ""}`}>
                        {Number(p.price).toFixed(2).replace(".", ",")}
                      </span>
                      <span className="lp-pper">/mês</span>
                    </div>
                    <p className="lp-pdesc">{p.description || "O plano perfeito para o seu negócio."}</p>
                    <div className="lp-pdiv" />
                    <ul className="lp-pfeats">
                      {features.map((f: string, i: number) => (
                        <li key={i}><span className="lp-ck lp-ck-y">✓</span>{f}</li>
                      ))}
                    </ul>
                    <button
                      className={`lp-btn ${isHot ? "lp-btn-primary" : "lp-btn-ghost"}`}
                      onClick={() => {
                        const ref = new URLSearchParams(window.location.search).get("ref");
                        const params = new URLSearchParams({ planId: p.id });
                        if (ref) params.set("ref", ref);
                        navigate(`/assinar?${params.toString()}`);
                      }}
                    >
                      Assinar Agora
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-zinc-400 font-medium">Nenhum plano disponível no momento.</div>
            )}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════ */}
      <section className="lp-testi" id="depoimentos">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Depoimentos</div>
            <h2 className="lp-sec-title lp-rv lp-d1">O que dizem nossos<br /><span className="lp-g">clientes</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Mais de 2.800 profissionais já transformaram seus negócios com a Agendelle.</p>
          </div>
          <div className="lp-testi-grid">
            {[
              { av:"MG", cls:"lp-ta1", name:"Mariana Gomes",   role:"Salão Mariana Beauty · SP", quote:"Minha agenda estava bagunçada e eu perdia tempo no WhatsApp. Depois da Agendelle, tudo ficou automático. Minha receita cresceu 40% no primeiro mês!" },
              { av:"JL", cls:"lp-ta2", name:"João Lima",        role:"Barbearia Corte & Arte · RJ", quote:"A função de lembrete via WhatsApp mudou tudo. As faltas caíram pra quase zero. Economizo mais de 2 horas por dia que eu gastava confirmando horário." },
              { av:"RF", cls:"lp-ta3", name:"Renata Fonseca",  role:"Studio Renata · BH", quote:"O sistema é lindo, fácil de usar e meus clientes adoraram o link de agendamento. Parece coisa de empresa grande. Não abro mão nunca mais." },
            ].map((t,i) => (
              <div key={t.name} className={`lp-testi-card lp-rv lp-d${i*2}`}>
                <div className="lp-stars">★★★★★</div>
                <p className="lp-tquote">"{t.quote}"</p>
                <div className="lp-tauthor">
                  <div className={`lp-tav ${t.cls}`}>{t.av}</div>
                  <div>
                    <div className="lp-tname">{t.name}</div>
                    <div className="lp-trole">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════ */}
      <section className="lp-cta">
        <div className="lp-container">
          <div className="lp-cta-box lp-rv">
            <div className="lp-cta-blob lp-cta-b1" />
            <div className="lp-cta-blob lp-cta-b2" />
            <h2>Pronto para ter a agenda<br />mais elegante do mercado?</h2>
            <p>Faça o teste e comprove você mesmo. Em menos de 5 minutos seu negócio está online, elegante e recebendo agendamentos.</p>
            <div className="lp-cta-acts">
              <button className="lp-btn lp-btn-white" onClick={() => navigate("/login")}>
                <Sparkles size={18} /> Solicitar teste de 30 dias
              </button>
              <button className="lp-btn lp-btn-clear" onClick={() => navigate("/login")}>
                Falar com especialista
              </button>
            </div>
            <div className="lp-cta-note">
              <span><Check size={16} /> 30 dias de teste</span> 
              <span>·</span> 
              <span><Check size={16} /> Sem fidelidade</span> 
              <span>·</span> 
              <span><Check size={16} /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-foot-top">
            <div className="lp-foot-brand">
              <img src={logoImg} alt="Agendelle" className="mb-6 h-10 w-auto" />
              <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
                A agenda elegante para salões e barbearias. 
                Tecnologia inteligente com sofisticação para o seu negócio crescer.
              </p>
            </div>
            <div className="lp-foot-col">
              <h5>Produto</h5>
              <ul>
                <li><a href="#recursos">Recursos</a></li>
                <li><a href="#precos">Preços</a></li>
                <li><a href="#como-funciona">Como Funciona</a></li>
                <li><button onClick={() => openWpp("sales")} className="lp-footer-link-btn">Falar com Vendas</button></li>
                <li><button onClick={() => openWpp("support")} className="lp-footer-link-btn">Suporte Técnico</button></li>
              </ul>
            </div>
            <div className="lp-foot-col">
              <h5>Empresa</h5>
              <ul>
                <li><a href="https://develoi.com.br/" target="_blank" rel="noopener noreferrer">Develoi Soluções Digitais</a></li>
                <li><a href="/blog">Nosso Blog</a></li>
                <li><a href="#">Privacidade</a></li>
              </ul>
            </div>
            <div className="lp-foot-col">
              <h5>Conecte-se</h5>
              <div className="flex gap-3 mt-2">
                <a href="#" className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all">
                  <Smartphone size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all">
                  <Globe size={18} />
                </a>
              </div>
            </div>
          </div>
          <div className="lp-foot-bot">
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-zinc-100">
              <p className="text-xs text-zinc-400">
                © 2026 Agendelle. Desenvolvido por <strong>Develoi Soluções Digitais</strong>.
              </p>
              <div className="flex gap-6 text-xs text-zinc-400">
                <Link to="/termos" className="hover:text-zinc-900">Termos de Uso</Link>
                <Link to="/privacidade" className="hover:text-zinc-900">Política de Privacidade</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
