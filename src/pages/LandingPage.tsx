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
import logoWhiteImg     from "../images/system/imagem-agendele-branco.png";
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
    return first?.phone || (type === "support" ? "5515997364674" : "5515997364674");
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
            <img src={scrolled ? logoImg : logoWhiteImg} alt="Agendelle" />
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
            <button className="lp-btn lp-btn-primary" onClick={() => openWpp("sales")}>Falar no WhatsApp →</button>
          </div>
          <button className={`lp-hamburger ${menuOpen ? "lp-active" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`lp-mob-menu ${menuOpen ? "lp-open" : ""}`}>
        <div className="lp-mob-menu-header">
          <img src={logoImg} alt="Agendelle" className="lp-mob-menu-logo" />
          <button className="lp-mob-menu-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <div className="lp-mob-menu-nav">
          <a href="#recursos"      onClick={() => scrollTo("#recursos")}>Recursos</a>
          <a href="#como-funciona" onClick={() => scrollTo("#como-funciona")}>Como Funciona</a>
          <a href="#precos"        onClick={() => scrollTo("#precos")}>Preços</a>
          <a href="#depoimentos"   onClick={() => scrollTo("#depoimentos")}>Depoimentos</a>
          <a href="/blog"          onClick={() => navigate("/blog")}>Blog</a>
        </div>
        <div className="lp-mob-menu-footer">
          <button className="lp-btn lp-btn-ghost"   onClick={() => navigate("/login")}>Entrar na conta</button>
          <button className="lp-btn lp-btn-primary" onClick={() => openWpp("sales")}>Falar no WhatsApp →</button>
        </div>
      </div>

      {/* ══ HERO ════════════════════════════════════ */}
      <section className="lp-hero">
        {/* Imagem de fundo */}
        <div className="lp-hero-bg-img" />
        {/* Overlay escuro */}
        <div className="lp-hero-overlay" />
        {/* Partículas douradas */}
        <div className="lp-hero-particles">
          {[...Array(18)].map((_,i) => <span key={i} className={`lp-particle lp-p${i%6}`} />)}
        </div>

        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <h1>
              Pare de perder horários<br />
              pelo <span className="lp-g">WhatsApp.</span>
            </h1>
            <p className="lp-hero-sub">
              Com o Agendelle, seu salão, barbearia ou studio recebe agendamentos online, envia lembretes automáticos, cria um site profissional e organiza clientes, pagamentos e equipe em um só lugar.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn lp-btn-hero-primary" onClick={() => scrollTo("#precos")}>
                Testar grátis por 30 dias
              </button>
              <button className="lp-btn lp-btn-hero-ghost" onClick={() => openWpp("sales")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Ver demonstração no WhatsApp
              </button>
            </div>
            <div className="lp-trust-pills">
              <span className="lp-trust-pill"><Check size={12} /> Sem cartão</span>
              <span className="lp-trust-pill"><Check size={12} /> Sem fidelidade</span>
              <span className="lp-trust-pill"><Check size={12} /> Implantação assistida</span>
            </div>
          </div>
        </div>

        {/* Ondas SVG animadas na base */}
        <div className="lp-hero-waves">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path className="lp-wave lp-wave-1" d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z" />
            <path className="lp-wave lp-wave-2" d="M0,80 C480,20 960,110 1440,70 L1440,120 L0,120 Z" />
            <path className="lp-wave lp-wave-3" d="M0,100 C320,60 1120,100 1440,85 L1440,120 L0,120 Z" />
          </svg>
        </div>
      </section>

      {/* ══ LOGOS BAR ═══════════════════════════════ */}
      <section className="lp-logos">
        <div className="lp-container">
          <p className="lp-logos-label">Para profissionais de beleza de todo o Brasil</p>
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
              { num: "30 dias", lbl: "Teste grátis para usar na prática" },
              { num: "5 min",   lbl: "Seu link de agendamento no ar" },
              { num: "24h",     lbl: "Clientes agendando mesmo fora do horário" },
              { num: "0",       lbl: "Fidelidade — cancele quando quiser" },
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
            <p className="lp-sec-sub lp-rv lp-d2">Chega de responder mensagem no WhatsApp para confirmar horário. O Agendelle organiza tudo de forma automática, profissional e simples.</p>
          </div>
          <div className="lp-feat-grid">
            {[
              { ico:<Smartphone />, cls:"lp-fi1", title:"Agendamento Online 24h",        desc:"Seu cliente escolhe serviço, profissional e horário pelo celular, sem depender de troca de mensagens." },
              { ico:<Globe />,      cls:"lp-fi2", title:"Site Próprio em Minutos",        desc:"Tenha um link profissional com seus serviços, fotos, equipe e botão de agendamento para colocar na bio do Instagram." },
              { ico:<Bell />,       cls:"lp-fi3", title:"Lembretes no WhatsApp",          desc:"Reduza faltas com confirmações e lembretes automáticos enviados antes do horário — sem você precisar fazer nada." },
              { ico:<BarChart3 />,  cls:"lp-fi4", title:"Financeiro e Comissões",         desc:"Acompanhe faturamento, pagamentos, comissões e desempenho dos profissionais em um só painel." },
              { ico:<Package />,    cls:"lp-fi5", title:"Produtos e Carrinho Online",     desc:"Venda serviços e produtos no seu próprio link, sem precisar criar uma loja separada." },
              { ico:<Star />,       cls:"lp-fi6", title:"Clube de Assinaturas",           desc:"Crie planos mensais e aumente sua receita recorrente com clientes que voltam todo mês." },
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
              <p className="lp-sec-sub">Deixe de usar papel ou grupos de WhatsApp para agendar. Com o Agendelle, tudo é automático, profissional e simples de usar.</p>
              <ul className="lp-ben-list">
                {[
                  { ico:<TrendingUp size={20} />, cls:"lp-bi1", title:"Menos faltas com lembretes automáticos",  desc:"O sistema avisa seu cliente no WhatsApp antes do horário — sem você precisar lembrar." },
                  { ico:<Clock size={20} />,      cls:"lp-bi2", title:"Mais tempo para o que importa",           desc:"Chega de responder mensagem para confirmar horário. O cliente agenda sozinho pelo link." },
                  { ico:<TrendingUp size={20} />, cls:"lp-bi3", title:"Aumente a percepção de profissionalismo", desc:"Seu cliente percebe a diferença na hora — confirmação bonita, elegante e confiável." },
                  { ico:<Sparkles size={20} />,   cls:"lp-bi4", title:"Financeiro organizado em um lugar",       desc:"Veja faturamento, comissões e desempenho da equipe sem planilha nem papel." },
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
            <p className="lp-sec-sub lp-rv lp-d2">Veja como o Agendelle se compara com agenda manual no WhatsApp e sistemas tradicionais.</p>
          </div>
          <div className="lp-cmp-wrap lp-rv lp-d2">
            <table className="lp-cmp-table">
              <thead>
                <tr>
                  <th className="lp-cmp-feature">Funcionalidade</th>
                  <th className="lp-cmp-agendelle">
                    <div className="lp-cmp-logo-cell">
                      <span className="lp-cmp-badge-winner">★ Agendelle</span>
                    </div>
                  </th>
                  <th className="lp-cmp-other">Agenda no WhatsApp</th>
                  <th className="lp-cmp-other">Sistemas Comuns</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feat: "Agendamento online 24h sem depender de você",     ag: true,  a: false,       b: true      },
                  { feat: "Site próprio com link para o Instagram",          ag: true,  a: false,       b: false     },
                  { feat: "Lembretes automáticos via WhatsApp",              ag: true,  a: false,       b: "parcial" },
                  { feat: "Carrinho de vendas online com produtos",          ag: true,  a: false,       b: false     },
                  { feat: "Fluxo de caixa e relatórios financeiros",         ag: true,  a: false,       b: true      },
                  { feat: "Comissões por profissional e por serviço",        ag: true,  a: false,       b: "parcial" },
                  { feat: "Clube de assinaturas com créditos",               ag: true,  a: false,       b: false     },
                  { feat: "Controle de estoque com movimentações",           ag: true,  a: false,       b: false     },
                  { feat: "Agenda individual por profissional",              ag: true,  a: false,       b: true      },
                  { feat: "Notificação ao profissional via WhatsApp",        ag: true,  a: false,       b: false     },
                  { feat: "Fila de espera automática",                       ag: true,  a: false,       b: false     },
                  { feat: "Agendamentos recorrentes e multi-sessão",         ag: true,  a: false,       b: false     },
                  { feat: "Suporte próximo na implantação",                  ag: true,  a: false,       b: "parcial" },
                  { feat: "Teste gratuito de 30 dias",                       ag: true,  a: false,       b: "5 dias"  },
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
          <p className="lp-cmp-disclaimer lp-rv lp-d3">* Comparativo baseado em funcionalidades disponíveis publicamente. Atualizado em 2026.</p>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════ */}
      <section className="lp-pricing" id="precos">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Planos</div>
            <h2 className="lp-sec-title lp-rv lp-d1">O plano certo para<br /><span className="lp-g">cada momento</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Teste 30 dias e comprove na prática. Cancele quando quiser, sem contratos ou fidelidade.</p>
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
                  const isHot = !!p.isPopular;

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
                    <p className="lp-pdesc">{p.description || (
                      p.name === "Básico" ? "Para profissionais autônomos que querem organizar a agenda e receber agendamentos online." :
                      p.name === "Pro" ? "Para salões e barbearias que precisam controlar agenda, caixa, comandas e equipe." :
                      "Para negócios com equipe maior e necessidade de gestão completa."
                    )}</p>
                    {p.maxProfessionals > 0 && (
                      <div className="lp-plan-limit">
                        <span className="lp-plan-limit-num">{p.maxProfessionals}</span>
                        <span className="lp-plan-limit-label">
                          {p.maxProfessionals === 1 ? "profissional" : "profissionais"}
                        </span>
                      </div>
                    )}
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
                      Testar grátis por 30 dias
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

      {/* ══ FAQ ═════════════════════════════════════ */}
      <section className="lp-faq" id="depoimentos">
        <div className="lp-container">
          <div className="lp-faq-inner">

            {/* Esquerda */}
            <div className="lp-faq-left lp-rv">
              <div className="lp-chip"><span className="lp-chip-dot" />Dúvidas frequentes</div>
              <h2 className="lp-sec-title">Tem alguma<br /><span className="lp-g">dúvida?</span></h2>
              <p className="lp-sec-sub">Respondemos as perguntas mais comuns. Se não encontrar o que procura, fale direto com a gente pelo WhatsApp.</p>
              <button
                className="lp-faq-wpp-btn lp-rv lp-d2"
                onClick={() => openWpp("support")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Tirar dúvidas no WhatsApp
              </button>
            </div>

            {/* Direita — perguntas */}
            <div className="lp-faq-list">
              {[
                { q: "Como funciona o teste de 30 dias?", a: "Você acessa o sistema completo por 30 dias sem nenhum custo. Nossa equipe te ajuda a configurar tudo — serviços, profissionais, horários e site. Só começa a cobrar depois do período de teste." },
                { q: "Preciso instalar algum aplicativo?", a: "Não. O Agendelle funciona direto no navegador, no celular ou computador. Seus clientes agendam pelo link da sua marca, sem instalar nada." },
                { q: "Posso usar para mais de um profissional?", a: "Sim. Você cadastra quantos profissionais quiser, cada um com sua própria agenda, serviços, horários e comissões." },
                { q: "Como funciona o lembrete automático via WhatsApp?", a: "O sistema envia mensagens automáticas para seus clientes confirmando o agendamento, lembrando 24h antes e 1h antes do horário." },
                { q: "Posso cancelar quando quiser?", a: "Sim, sem multa e sem fidelidade. Você cancela pelo painel a qualquer momento." },
              ].map((item, i) => (
                <details key={i} className={`lp-faq-item lp-rv lp-d${i}`}>
                  <summary className="lp-faq-q">
                    {item.q}
                    <span className="lp-faq-icon">+</span>
                  </summary>
                  <p className="lp-faq-a">{item.a}</p>
                </details>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══ WHATSAPP FLUTUANTE ═══════════════════════ */}
      <a
        className="lp-wpp-float"
        href={`https://wa.me/5515997364674?text=${encodeURIComponent("Olá! Tenho uma dúvida sobre o Agendelle.")}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <span>Falar com a gente</span>
      </a>

      {/* ══ CTA ═════════════════════════════════════ */}
      <section className="lp-cta lp-rv">
        <div className="lp-cta-glow lp-cta-g1" />
        <div className="lp-cta-glow lp-cta-g2" />
        <div className="lp-container">
          <div className="lp-cta-inner">

            {/* Esquerda */}
            <div className="lp-cta-left">
              <div className="lp-cta-label">Comece hoje</div>
              <h2>Organize sua<br />agenda em<br /><span className="lp-cta-gold">5 minutos.</span></h2>
              <p>30 dias grátis para testar tudo.<br />Sem contrato, sem fidelidade.</p>
            </div>

            {/* Direita */}
            <div className="lp-cta-right">
              <div className="lp-cta-card">
                <div className="lp-cta-checks">
                  {[
                    "Agenda online 24h no seu link",
                    "Site profissional em 5 minutos",
                    "Lembretes automáticos via WhatsApp",
                    "Financeiro e comissões da equipe",
                    "Suporte próximo na implantação",
                  ].map(item => (
                    <div key={item} className="lp-cta-check-item">
                      <div className="lp-cta-check-ico"><Check size={13} /></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="lp-cta-btns">
                  <button className="lp-btn lp-cta-btn-primary" onClick={() => scrollTo("#precos")}>
                    Testar grátis por 30 dias
                  </button>
                  <button className="lp-btn lp-cta-btn-ghost" onClick={() => openWpp("sales")}>
                    Falar no WhatsApp →
                  </button>
                </div>
                <p className="lp-cta-fine">Teste 30 dias grátis · Cancele quando quiser</p>
              </div>
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
                <li><button onClick={() => openWpp("sales")} className="lp-footer-link-btn">Falar no WhatsApp</button></li>
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
              <div className="lp-foot-social">
                <a href="https://www.instagram.com/develoi.solucoesdigitais/" target="_blank" rel="noopener noreferrer" className="lp-foot-social-btn lp-foot-social-ig" aria-label="Instagram Develoi">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://develoi.com.br/" target="_blank" rel="noopener noreferrer" className="lp-foot-social-btn lp-foot-social-web" aria-label="Site Develoi">
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
