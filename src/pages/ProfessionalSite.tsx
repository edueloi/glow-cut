import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Scissors, 
  MapPin, 
  Instagram, 
  Clock, 
  User, 
  ShoppingBag, 
  ArrowRight, 
  Target, 
  Eye, 
  Heart,
  ChevronRight,
  Menu,
  X,
  Phone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  welcomeMessage: string | null;
  address: string | null;
  instagram: string | null;
  phone: string | null;
  themeColor: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  mission: string | null;
  vision: string | null;
  values: string | null;
  aboutTitle: string | null;
  feature1Title: string | null;
  feature1Description: string | null;
  feature2Title: string | null;
  feature2Description: string | null;
  feature3Title: string | null;
  feature3Description: string | null;
  showProducts: boolean;
  showServices: boolean;
  showTeam: boolean;
}

export default function ProfessionalSite() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        // Fetch Tenant
        const tenantRes = await fetch(`/api/tenant-by-slug/${slug}`);
        if (!tenantRes.ok) {
          setLoading(false);
          return;
        }
        const tenantData = await tenantRes.json();
        console.log("[SiteDebug] Tenant Data:", tenantData);
        setTenant(tenantData);

        const headers = { "x-tenant-id": tenantData.id };

        // Fetch Professionals
        const profRes = await fetch("/api/public/professionals", { headers });
        if (profRes.ok) {
          const profData = await profRes.json();
          setProfessionals(Array.isArray(profData) ? profData.filter(p => p.isActive !== false) : []);
        }

        // Fetch Services
        const svcRes = await fetch("/api/public/services", { headers });
        if (svcRes.ok) {
          const svcData = await svcRes.json();
          setServices(Array.isArray(svcData) ? svcData.filter(s => s.type === "service") : []);
        }

        // Fetch Products (Will need to implement this endpoint or fallback)
        const prodRes = await fetch("/api/public/products", { headers });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(Array.isArray(prodData) ? prodData : []);
        }

      } catch (error) {
        console.error("Error fetching site data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-500">Carregando site...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50">
        <div className="w-20 h-20 bg-zinc-200 rounded-3xl flex items-center justify-center text-zinc-400 mb-6">
          <X size={40} />
        </div>
        <h1 className="text-4xl font-black text-zinc-900 mb-2">Ops!</h1>
        <p className="text-zinc-500 mb-8 max-w-xs">Este estabelecimento não foi encontrado ou está temporariamente indisponível.</p>
        <button 
          onClick={() => navigate("/")}
          className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10"
        >
          Explorar Agendelle
        </button>
      </div>
    );
  }

  const themeColor = tenant.themeColor || "#18181b";
  const primaryBtnStyle = { backgroundColor: themeColor };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      
      {/* ── NAVBAR ────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-10 object-contain rounded-lg" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={primaryBtnStyle}>
                <Scissors size={20} />
              </div>
            )}
            <span className="text-xl font-black tracking-tight">{tenant.name}</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#sobre" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Quem Somos</a>
            {tenant.showServices !== false && <a href="#servicos" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Serviços</a>}
            {(tenant.showProducts !== false && products.length > 0) && <a href="#produtos" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Produtos</a>}
            {tenant.showTeam !== false && <a href="#equipe" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Equipe</a>}
            <Link 
              to={`/${slug}/agendar`}
              className="px-6 py-2.5 text-white text-sm font-bold rounded-full shadow-lg shadow-zinc-900/10 hover:scale-105 active:scale-95 transition-all"
              style={primaryBtnStyle}
            >
              Agendar Agora
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-zinc-900"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 z-[60] bg-white flex flex-col p-8"
          >
            <div className="flex justify-end mb-12">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-zinc-900">
                <X size={32} />
              </button>
            </div>
            <div className="flex flex-col gap-8 text-center">
              <a href="#sobre" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black text-zinc-900">Quem Somos</a>
              {tenant.showServices !== false && <a href="#servicos" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black text-zinc-900">Serviços</a>}
              {(tenant.showProducts !== false && products.length > 0) && <a href="#produtos" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black text-zinc-900">Produtos</a>}
              {tenant.showTeam !== false && <a href="#equipe" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black text-zinc-900">Equipe</a>}
              <Link 
                to={`/${slug}/agendar`}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 px-8 py-4 text-white text-lg font-bold rounded-2xl shadow-xl shadow-zinc-900/10"
                style={primaryBtnStyle}
              >
                Agendar Agora
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO SECTION ──────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[70vh] -z-10">
          {tenant.coverUrl ? (
            <div className="w-full h-full relative">
              <img src={tenant.coverUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/40 to-white" />
            </div>
          ) : (
            <div className="w-full h-full bg-zinc-50" />
          )}
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter leading-tight mb-6">
                {tenant.welcomeMessage || `Bem-vindo ao ${tenant.name}`}
              </h1>
              <p className="text-lg md:text-xl text-zinc-600 font-medium mb-10 leading-relaxed">
                {tenant.description || "Transformando sua aparência com excelência e profissionalismo. Agende seu horário e viva uma experiência única de autocuidado."}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to={`/${slug}/agendar`}
                  className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-zinc-900/20 flex items-center gap-2"
                  style={primaryBtnStyle}
                >
                  Fazer Agendamento <ArrowRight size={20} />
                </Link>
                {tenant.instagram && (
                  <a 
                    href={tenant.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-white text-zinc-900 border border-zinc-200 font-bold rounded-2xl hover:bg-zinc-50 transition-all flex items-center gap-2"
                  >
                    <Instagram size={20} /> Instagram
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── QUEM SOMOS ────────────────────────────── */}
      <section id="sobre" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-square rounded-[40px] overflow-hidden shadow-2xl">
                <img 
                  src={tenant.coverUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800"} 
                  alt="About Us" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-zinc-900 rounded-[32px] p-8 text-white hidden md:flex flex-col justify-end" style={primaryBtnStyle}>
                <span className="text-4xl font-black mb-1">10+</span>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Anos de experiência</span>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full" style={primaryBtnStyle} /> Quem Somos
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-8">
                {tenant.aboutTitle || "Nossa História"}
              </h2>
              <p className="text-zinc-600 text-lg leading-relaxed mb-12 whitespace-pre-line">
                {tenant.description || `O ${tenant.name} nasceu da paixão pela beleza e pelo bem-estar. Localizado no coração de ${tenant.address || "nossa cidade"}, buscamos oferecer não apenas um serviço, mas um momento de renovação para cada cliente que passa por nossas portas.`}
              </p>
              
              {/* Mission, Vision, Values */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 border-t border-zinc-100">
                {tenant.mission && (
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                      <Target size={20} />
                    </div>
                    <h4 className="font-black text-zinc-900">Missão</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">{tenant.mission}</p>
                  </div>
                )}
                {tenant.vision && (
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                      <Eye size={20} />
                    </div>
                    <h4 className="font-black text-zinc-900">Visão</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">{tenant.vision}</p>
                  </div>
                )}
                {tenant.values && (
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                      <Heart size={20} />
                    </div>
                    <h4 className="font-black text-zinc-900">Valores</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">{tenant.values}</p>
                  </div>
                )}
                {!tenant.mission && !tenant.vision && !tenant.values && (
                  <>
                {/* Features (Diferenciais) */}
                {(tenant.feature1Title || tenant.feature2Title || tenant.feature3Title) ? (
                  <>
                    {tenant.feature1Title && (
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                          <Target size={20} />
                        </div>
                        <h4 className="font-black text-zinc-900">{tenant.feature1Title}</h4>
                        <p className="text-sm text-zinc-500 leading-relaxed">{tenant.feature1Description}</p>
                      </div>
                    )}
                    {tenant.feature2Title && (
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                          <User size={20} />
                        </div>
                        <h4 className="font-black text-zinc-900">{tenant.feature2Title}</h4>
                        <p className="text-sm text-zinc-500 leading-relaxed">{tenant.feature2Description}</p>
                      </div>
                    )}
                    {tenant.feature3Title && (
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                          <Heart size={20} />
                        </div>
                        <h4 className="font-black text-zinc-900">{tenant.feature3Title}</h4>
                        <p className="text-sm text-zinc-500 leading-relaxed">{tenant.feature3Description}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                        <Target size={20} />
                      </div>
                      <h4 className="font-black text-zinc-900">Qualidade</h4>
                      <p className="text-sm text-zinc-500 leading-relaxed">Excelência em cada detalhe do atendimento.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                        <User size={20} />
                      </div>
                      <h4 className="font-black text-zinc-900">Equipe</h4>
                      <p className="text-sm text-zinc-500 leading-relaxed">Profissionais altamente qualificados.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-900">
                        <Heart size={20} />
                      </div>
                      <h4 className="font-black text-zinc-900">Cuidado</h4>
                      <p className="text-sm text-zinc-500 leading-relaxed">Seu bem-estar é nossa maior prioridade.</p>
                    </div>
                  </>
                )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ─────────────────────────────── */}
      {tenant.showServices !== false && (
        <section id="servicos" className="py-24 bg-zinc-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                  <span className="w-1.5 h-1.5 rounded-full" style={primaryBtnStyle} /> Especialidades
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">O que fazemos</h2>
              </div>
              <Link 
                to={`/${slug}/agendar`}
                className="text-sm font-bold flex items-center gap-2 group hover:gap-3 transition-all"
                style={{ color: themeColor }}
              >
                Ver todos os serviços <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.length > 0 ? services.slice(0, 6).map((service) => (
                <div key={service.id} className="bg-white p-8 rounded-[32px] border border-zinc-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Scissors size={24} className="text-zinc-900" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 mb-2">{service.name}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-6 line-clamp-2">
                    {service.description || "Tratamento personalizado realizado por especialistas para garantir o melhor resultado para você."}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 uppercase">
                        <Clock size={12} /> {service.duration} min
                      </div>
                    </div>
                    <span className="text-lg font-black text-zinc-900">R$ {parseFloat(service.price).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-zinc-200">
                    <Scissors size={32} />
                  </div>
                  <p className="text-zinc-400 font-bold uppercase tracking-widest">Nossos serviços estarão disponíveis em breve.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── PRODUTOS ─────────────────────────────── */}
      {(tenant.showProducts !== false && products.length > 0) && (
        <section id="produtos" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full" style={primaryBtnStyle} /> Shop
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">Nossos Produtos</h2>
              <p className="text-zinc-500 mt-4 max-w-xl mx-auto">Leve a experiência do nosso studio para sua casa com produtos profissionais selecionados.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.slice(0, 4).map((product) => (
                <div key={product.id} className="group cursor-pointer">
                  <div className="aspect-[3/4] rounded-[32px] overflow-hidden bg-zinc-100 mb-6 relative">
                    {product.photo ? (
                      <img src={product.photo} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <ShoppingBag size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <h3 className="font-black text-zinc-900 mb-1 group-hover:text-zinc-700 transition-colors">{product.name}</h3>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-2">{product.sector?.name || "Premium"}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-zinc-900">R$ {parseFloat(product.salePrice).toFixed(2).replace(".", ",")}</span>
                    <div className="p-2 bg-zinc-900 text-white rounded-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all" style={primaryBtnStyle}>
                      <ShoppingBag size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-16 p-10 bg-zinc-900 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden" style={primaryBtnStyle}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10 max-w-xl">
                <h3 className="text-3xl font-black mb-4 tracking-tight">Precisa de reposição?</h3>
                <p className="text-white/70 leading-relaxed font-medium">Todos os nossos produtos estão disponíveis para compra direta em nosso PDV. Consulte disponibilidade e garanta o melhor para o seu cuidado diário.</p>
              </div>
              <Link 
                to={`/${slug}/agendar`}
                className="relative z-10 px-8 py-4 bg-white text-zinc-900 font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
              >
                Falar com Equipe
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── EQUIPE ───────────────────────────────── */}
      {tenant.showTeam !== false && (
        <section id="equipe" className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full" style={primaryBtnStyle} /> Time de Elite
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">Nossa Equipe</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {professionals.map((prof) => (
              <div key={prof.id} className="group">
                <div className="aspect-[4/5] rounded-[32px] overflow-hidden bg-zinc-200 mb-6 relative shadow-lg">
                  {prof.photo ? (
                    <img src={prof.photo} alt={prof.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-5xl font-black" style={primaryBtnStyle}>
                      {prof.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">{prof.role || "Especialista"}</p>
                      <Link 
                        to={`/${slug}/agendar?profId=${prof.id}`} 
                        className="text-xs font-bold flex items-center justify-between"
                        style={{ color: themeColor }}
                      >
                        Agendar com {prof.name.split(" ")[0]} <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-black text-zinc-900 mb-1 text-center">{prof.name}</h3>
                <p className="text-sm text-zinc-400 font-bold text-center uppercase tracking-widest">{prof.role || "Profissional"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── FOOTER ───────────────────────────────── */}
      <footer className="bg-zinc-950 text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-10 object-contain rounded-lg brightness-0 invert" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white text-zinc-900">
                    <Scissors size={20} />
                  </div>
                )}
                <span className="text-2xl font-black tracking-tight">{tenant.name}</span>
              </div>
              <p className="text-zinc-500 leading-relaxed mb-8">
                {tenant.description || "Referência em beleza e bem-estar, proporcionando momentos únicos de cuidado para nossos clientes."}
              </p>
              <div className="flex gap-4">
                {tenant.instagram && (
                  <a href={tenant.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors">
                    <Instagram size={18} />
                  </a>
                )}
                {tenant.phone && (
                  <a href={`tel:${tenant.phone}`} className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors">
                    <Phone size={18} />
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black mb-8">Navegação</h4>
              <ul className="space-y-4 text-zinc-500 font-medium">
                <li><a href="#sobre" className="hover:text-white transition-colors">Quem Somos</a></li>
                {tenant.showServices !== false && <li><a href="#servicos" className="hover:text-white transition-colors">Serviços</a></li>}
                {(tenant.showProducts !== false && products.length > 0) && <li><a href="#produtos" className="hover:text-white transition-colors">Produtos</a></li>}
                {tenant.showTeam !== false && <li><a href="#equipe" className="hover:text-white transition-colors">Equipe</a></li>}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-black mb-8">Informações</h4>
              <ul className="space-y-4 text-zinc-500 font-medium">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="shrink-0 text-white mt-1" />
                  <span>{tenant.address || "Rua Exemplo, 123 - Centro, Cidade"}</span>
                </li>
                {tenant.phone && (
                  <li className="flex items-center gap-3">
                    <Phone size={18} className="shrink-0 text-white" />
                    <span>{tenant.phone}</span>
                  </li>
                )}
                <li className="flex items-center gap-3">
                  <Clock size={18} className="shrink-0 text-white" />
                  <span>Seg - Sáb: 09h às 20h</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-1">
              <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                <h4 className="text-xl font-black mb-4">Agende agora</h4>
                <p className="text-sm text-zinc-500 mb-6">Escolha seu profissional e serviço favorito em poucos segundos.</p>
                <Link 
                  to={`/${slug}/agendar`}
                  className="w-full py-3 bg-white text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-lg"
                >
                  Ir para Agenda <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">
              © 2026 {tenant.name} • Desenvolvido por <span className="text-zinc-400">Agendelle</span>
            </p>
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              <a href="#" className="hover:text-zinc-400">Privacidade</a>
              <a href="#" className="hover:text-zinc-400">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
