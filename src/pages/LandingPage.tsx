import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

import logoImg    from "../images/system/imagem-agendele.png";
import faviconImg from "../images/system/logo-favicon.png";

export default function LandingPage() {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
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
  }, []);

  /* smooth scroll */
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
            <button className="lp-btn lp-btn-primary" onClick={() => navigate("/login")}>Falar com vendas →</button>
          </div>
          <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
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
        <button className="lp-btn lp-btn-primary" onClick={() => navigate("/login")}>Falar com vendas →</button>
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
                Versão 2.0 com Inteligência Artificial
              </div>
              <h1>
                A agenda <span className="lp-g">elegante</span><br />
                para o seu negócio<br />de beleza
              </h1>
              <p className="lp-hero-sub">
                Agendelle une organização inteligente com elegância — o sistema perfeito para salões e barbearias que querem crescer com profissionalismo.
              </p>
              <div className="lp-hero-actions">
                <button className="lp-btn lp-btn-primary" style={{padding:"15px 30px",fontSize:"1rem"}} onClick={() => navigate("/login")}>
                  ✦ Solicitar teste de 30 dias
                </button>
                <button className="lp-btn lp-btn-ghost" style={{padding:"15px 26px",fontSize:"1rem"}} onClick={() => scrollTo("#como-funciona")}>
                  ▷ Ver como funciona
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
            {["✂️ Barbearias","💅 Salões","💇 Studios de Beleza","💆 Spas","💈 Barbearia Premium","🌟 Estéticas"].map((item, i, arr) => (
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
              { ico:"📱", cls:"lp-fi1", title:"Agendamento Online 24/7",    desc:"Seus clientes agendam pelo celular a qualquer hora, sem precisar ligar. Link personalizado da sua marca, pronto para compartilhar." },
              { ico:"🔔", cls:"lp-fi2", title:"Lembretes Automáticos",       desc:"WhatsApp e SMS automáticos reduzem faltas em até 70%. Os clientes recebem lembretes inteligentes antes do horário." },
              { ico:"📊", cls:"lp-fi3", title:"Relatórios e Métricas",       desc:"Dashboard completo com faturamento, serviços mais populares, horários de pico e desempenho da equipe em tempo real." },
              { ico:"👥", cls:"lp-fi4", title:"Gestão de Equipe",            desc:"Cada profissional tem sua agenda individual. Defina serviços, comissões e horários por colaborador com facilidade." },
              { ico:"💳", cls:"lp-fi5", title:"Pagamento Online",            desc:"Aceite sinal ou pagamento completo no ato do agendamento. Integração com Pix, cartão de crédito e débito." },
              { ico:"🤖", cls:"lp-fi6", title:"IA de Atendimento",           desc:"Chatbot com IA que responde dúvidas, confirma horários e faz agendamentos pelo WhatsApp automaticamente." },
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
                  { ico:"📉", cls:"lp-bi1", title:"Reduza faltas em até 70%",    desc:"Lembretes automáticos via WhatsApp, SMS e e-mail garantem que seus clientes apareçam." },
                  { ico:"⏱️", cls:"lp-bi2", title:"Economize 3h por dia",         desc:"Chega de responder mensagem para confirmar horário. Tudo acontece automaticamente." },
                  { ico:"📈", cls:"lp-bi3", title:"Aumente o ticket médio",        desc:"Sugira serviços complementares no momento do agendamento e venda mais sem esforço." },
                  { ico:"✨", cls:"lp-bi4", title:"Imagem profissional imediata",  desc:"Seu cliente percebe a diferença na hora — confirmação bonita, elegante e confiável." },
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

      {/* ══ PRICING ═════════════════════════════════ */}
      <section className="lp-pricing" id="precos">
        <div className="lp-container">
          <div className="lp-sec-header">
            <div className="lp-chip lp-rv"><span className="lp-chip-dot" />Planos</div>
            <h2 className="lp-sec-title lp-rv lp-d1">O plano certo para<br /><span className="lp-g">cada momento</span></h2>
            <p className="lp-sec-sub lp-rv lp-d2">Faça um teste de 30 dias e comprove o valor. Cancele quando quiser — sem contratos ou surpresas.</p>
          </div>
          <div className="lp-price-grid">

            <div className="lp-price-card lp-rv">
              <div className="lp-pname">Básico</div>
              <div className="lp-pamount"><span className="lp-pcur">R$</span><span className="lp-pnum">49,90</span><span className="lp-pper">/mês</span></div>
              <p className="lp-pdesc">Perfeito para pequenos espaços conhecerem a plataforma.</p>
              <div className="lp-pdiv" />
              <ul className="lp-pfeats">
                {["Agenda, Clientes e Serviços","Até 2 profissionais cadastrados","1 usuário admin"].map(f=><li key={f}><span className="lp-ck lp-ck-y">✓</span>{f}</li>)}
                {["Comandas e Financeiro","Relatórios"].map(f=><li key={f} style={{color:"#9ca3af"}}><span className="lp-ck lp-ck-n">×</span>{f}</li>)}
              </ul>
              <button className="lp-btn lp-btn-ghost" onClick={() => navigate("/login")}>Falar com vendas</button>
            </div>

            <div className="lp-price-card lp-hot lp-rv lp-d2">
              <div className="lp-hot-badge">★ Mais popular</div>
              <div className="lp-pname">Pro</div>
              <div className="lp-pamount"><span className="lp-pcur">R$</span><span className="lp-pnum lp-g">99,90</span><span className="lp-pper">/mês</span></div>
              <p className="lp-pdesc">Para negócios estabilizados crescendo com profissionalismo.</p>
              <div className="lp-pdiv" />
              <ul className="lp-pfeats">
                {["Agenda, Clientes e Serviços","Comandas e Fluxo de Caixa","Relatórios de Vendas","Até 5 profissionais","3 usuários admin"].map(f=><li key={f}><span className="lp-ck lp-ck-y">✓</span>{f}</li>)}
                {["Suporte prioritário 24/7"].map(f=><li key={f} style={{color:"#9ca3af"}}><span className="lp-ck lp-ck-n">×</span>{f}</li>)}
              </ul>
              <button className="lp-btn lp-btn-primary" onClick={() => navigate("/login")}>Solicitar Teste →</button>
            </div>

            <div className="lp-price-card lp-rv lp-d4">
              <div className="lp-pname">Enterprise</div>
              <div className="lp-pamount"><span className="lp-pcur">R$</span><span className="lp-pnum">199,90</span><span className="lp-pper">/mês</span></div>
              <p className="lp-pdesc">Para redes avançadas e operações de alto volume.</p>
              <div className="lp-pdiv" />
              <ul className="lp-pfeats">
                {["Tudo do plano Pro","Profissionais ilimitados","Multi-usuários ilimitados","Suporte VIP prioritário"].map(f=><li key={f}><span className="lp-ck lp-ck-y">✓</span>{f}</li>)}
              </ul>
              <button className="lp-btn lp-btn-ghost" onClick={() => navigate("/login")}>Falar com vendas</button>
            </div>

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
              <button className="lp-btn lp-btn-white" style={{padding:"16px 36px",fontSize:"1rem"}} onClick={() => navigate("/login")}>
                ✦ Solicitar teste de 30 dias
              </button>
              <button className="lp-btn lp-btn-clear" style={{padding:"16px 32px",fontSize:"1rem"}} onClick={() => navigate("/login")}>
                Falar com especialista
              </button>
            </div>
            <p className="lp-cta-note">✓ 30 dias de teste &nbsp;·&nbsp; ✓ Sem cartão &nbsp;·&nbsp; ✓ Cancele quando quiser</p>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-foot-top">
            <div className="lp-foot-brand">
              <img src={logoImg} alt="Agendelle" />
              <p>A agenda elegante para salões e barbearias. Tecnologia inteligente com sofisticação para o seu negócio crescer.</p>
            </div>
            <div className="lp-foot-col">
              <h5>Produto</h5>
              <ul>
                <li><a href="#recursos"      onClick={e=>{e.preventDefault();scrollTo("#recursos")}}>Recursos</a></li>
                <li><a href="#precos"        onClick={e=>{e.preventDefault();scrollTo("#precos")}}>Preços</a></li>
                <li><a href="#como-funciona" onClick={e=>{e.preventDefault();scrollTo("#como-funciona")}}>Como Funciona</a></li>
                <li><a href="#depoimentos"   onClick={e=>{e.preventDefault();scrollTo("#depoimentos")}}>Depoimentos</a></li>
              </ul>
            </div>
            <div className="lp-foot-col">
              <h5>Empresa</h5>
              <ul>
                <li><a href="#">Sobre nós</a></li>
                <li><a href="/blog" onClick={e => { e.preventDefault(); navigate("/blog"); }}>Blog</a></li>
                <li><a href="#">Parceiros</a></li>
                <li><a href="#">Carreiras</a></li>
              </ul>
            </div>
            <div className="lp-foot-col">
              <h5>Suporte</h5>
              <ul>
                <li><a href="#">Central de ajuda</a></li>
                <li><a href="#">Contato</a></li>
                <li><a href="#">WhatsApp</a></li>
                <li><a href="#">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-foot-bot">
            <p>© 2026 Agendelle. Todos os direitos reservados. &nbsp;·&nbsp;
              <a href="#" style={{color:"var(--lp-text3)"}}>Privacidade</a> &nbsp;·&nbsp;
              <a href="#" style={{color:"var(--lp-text3)"}}>Termos</a>
            </p>
            <div className="lp-foot-soc">
              <a href="#" className="lp-soc-btn">📸</a>
              <a href="#" className="lp-soc-btn">💬</a>
              <a href="#" className="lp-soc-btn">💼</a>
              <a href="#" className="lp-soc-btn">▶</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
