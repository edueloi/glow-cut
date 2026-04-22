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
  Phone,
  Star,
  Calendar,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
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
  siteCoverUrl: string | null;
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
  experienceYears: string | null;
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
  const [scrolled, setScrolled] = useState(false);
  const [cartItems, setCartItems] = useState<{ product: any; quantity: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        const tenantRes = await fetch(`/api/tenant-by-slug/${slug}`);
        if (!tenantRes.ok) { setLoading(false); return; }
        const tenantData = await tenantRes.json();
        setTenant(tenantData);
        const headers = { "x-tenant-id": tenantData.id };

        const [profRes, svcRes, prodRes] = await Promise.all([
          fetch("/api/public/professionals", { headers }),
          fetch("/api/public/services", { headers }),
          fetch("/api/public/products", { headers }),
        ]);
        if (profRes.ok) {
          const d = await profRes.json();
          setProfessionals(Array.isArray(d) ? d.filter((p: any) => p.isActive !== false) : []);
        }
        if (svcRes.ok) {
          const d = await svcRes.json();
          setServices(Array.isArray(d) ? d.filter((s: any) => s.type === "service") : []);
        }
        if (prodRes.ok) {
          const d = await prodRes.json();
          setProducts(Array.isArray(d) ? d : []);
        }
      } catch (e) {
        console.error("Error fetching site data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50">
        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300 mb-6">
          <X size={32} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 mb-2">Não encontrado</h1>
        <p className="text-zinc-500 mb-8 max-w-xs text-sm">Este estabelecimento não foi encontrado ou está indisponível.</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl text-sm"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  const themeColor = tenant.themeColor || "#18181b";
  const bookingUrl = `/${slug}/agendar`;
  // siteCoverUrl é exclusivo do site externo; coverUrl é da agenda online.
  // Usa siteCoverUrl se definido, senão cai no coverUrl como fallback.
  const heroImage = tenant.siteCoverUrl || tenant.coverUrl;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const priceStr = (v: number | string) =>
    `R$ ${parseFloat(String(v)).toFixed(2).replace(".", ",")}`;

  const addToCart = (product: any) => {
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const changeQty = (productId: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(i => {
        if (i.product.id !== productId) return i;
        const newQty = i.quantity + delta;
        return newQty <= 0 ? null : { ...i, quantity: newQty };
      }).filter(Boolean) as { product: any; quantity: number }[];
    });
  };

  const cartTotal = cartItems.reduce((sum, i) => sum + parseFloat(String(i.product.salePrice || 0)) * i.quantity, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const buildWppMessage = () => {
    const lines = [`Olá! Gostaria de comprar os seguintes produtos de *${tenant?.name}*:\n`];
    cartItems.forEach(({ product, quantity }) => {
      const price = parseFloat(String(product.salePrice || 0));
      const lineTotal = (price * quantity).toFixed(2).replace(".", ",");
      const brand = product.brand ? ` (${product.brand})` : "";
      lines.push(`• ${product.name}${brand} — ${quantity}x R$ ${price.toFixed(2).replace(".", ",")} = R$ ${lineTotal}`);
    });
    lines.push(`\n*Total: R$ ${cartTotal.toFixed(2).replace(".", ",")}*`);
    lines.push("\nAguardo retorno para combinar a entrega. Obrigado(a)!");
    return lines.join("\n");
  };

  const handleCartWhatsapp = () => {
    if (!tenant?.phone) return;
    const phone = tenant.phone.replace(/\D/g, "");
    const msg = buildWppMessage();
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const featureItems = () => {
    if (tenant.mission || tenant.vision || tenant.values) {
      return [
        tenant.mission  && { icon: <Target size={18} />,  title: "Missão",  text: tenant.mission  },
        tenant.vision   && { icon: <Eye size={18} />,     title: "Visão",   text: tenant.vision   },
        tenant.values   && { icon: <Heart size={18} />,   title: "Valores", text: tenant.values   },
      ].filter(Boolean) as { icon: React.ReactNode; title: string; text: string }[];
    }
    if (tenant.feature1Title || tenant.feature2Title || tenant.feature3Title) {
      return [
        tenant.feature1Title && { icon: <Target size={18} />, title: tenant.feature1Title, text: tenant.feature1Description || "" },
        tenant.feature2Title && { icon: <User size={18} />,   title: tenant.feature2Title, text: tenant.feature2Description || "" },
        tenant.feature3Title && { icon: <Heart size={18} />,  title: tenant.feature3Title, text: tenant.feature3Description || "" },
      ].filter(Boolean) as { icon: React.ReactNode; title: string; text: string }[];
    }
    return [
      { icon: <Target size={18} />, title: "Qualidade",  text: "Excelência em cada detalhe do atendimento." },
      { icon: <User size={18} />,   title: "Equipe",     text: "Profissionais altamente qualificados." },
      { icon: <Heart size={18} />,  title: "Cuidado",    text: "Seu bem-estar é nossa maior prioridade." },
    ];
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">

      {/* ── NAVBAR ──────────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-zinc-100"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to={`/${slug}`} className="flex items-center gap-2.5">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-8 w-8 object-contain rounded-lg"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: scrolled ? themeColor : "rgba(255,255,255,0.15)" }}
              >
                <Scissors size={15} />
              </div>
            )}
            <span className={`font-black text-base tracking-tight transition-colors ${scrolled ? "text-zinc-900" : "text-white"}`}>
              {tenant.name}
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#sobre"    className={`text-xs font-bold transition-colors uppercase tracking-wider ${scrolled ? "text-zinc-500 hover:text-zinc-900" : "text-white/70 hover:text-white"}`}>Quem Somos</a>
            {tenant.showServices !== false && <a href="#servicos" className={`text-xs font-bold transition-colors uppercase tracking-wider ${scrolled ? "text-zinc-500 hover:text-zinc-900" : "text-white/70 hover:text-white"}`}>Serviços</a>}
            {tenant.showProducts !== false && products.length > 0 && <a href="#produtos" className={`text-xs font-bold transition-colors uppercase tracking-wider ${scrolled ? "text-zinc-500 hover:text-zinc-900" : "text-white/70 hover:text-white"}`}>Produtos</a>}
            {tenant.showTeam !== false && <a href="#equipe" className={`text-xs font-bold transition-colors uppercase tracking-wider ${scrolled ? "text-zinc-500 hover:text-zinc-900" : "text-white/70 hover:text-white"}`}>Equipe</a>}
            <Link
              to={bookingUrl}
              className={`px-5 py-2 text-xs font-bold rounded-full shadow-md hover:opacity-90 active:scale-95 transition-all ${scrolled ? "text-white" : "bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"}`}
              style={scrolled ? { backgroundColor: themeColor } : {}}
            >
              Agendar Agora
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-zinc-700 hover:bg-zinc-100" : "text-white hover:bg-white/10"}`}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-72 bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
                <span className="font-black text-zinc-900">{tenant.name}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100" aria-label="Fechar menu">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-1 p-4 flex-1">
                {[
                  { label: "Quem Somos", href: "#sobre" },
                  ...(tenant.showServices !== false ? [{ label: "Serviços", href: "#servicos" }] : []),
                  ...(tenant.showProducts !== false && products.length > 0 ? [{ label: "Produtos", href: "#produtos" }] : []),
                  ...(tenant.showTeam !== false ? [{ label: "Equipe", href: "#equipe" }] : []),
                ].map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
              <div className="p-4 border-t border-zinc-100">
                <Link
                  to={bookingUrl}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all"
                  style={{ backgroundColor: themeColor }}
                >
                  <Calendar size={16} /> Agendar Horário
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── HERO ──────────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={!heroImage ? { background: `linear-gradient(135deg, ${themeColor} 0%, #0f0f0f 100%)` } : {}}
      >
        {/* Cover image + overlay */}
        {heroImage && (
          <div className="absolute inset-0">
            <img src={heroImage} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-zinc-950/25" />
          </div>
        )}

        {/* Padrão decorativo quando não tem cover */}
        {!heroImage && (
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)`,
              backgroundSize: "28px 28px",
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 pt-28 pb-20 md:pt-36 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="max-w-2xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-[10px] font-bold uppercase tracking-widest mb-5">
              <Sparkles size={10} /> Studio Premium
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.05] mb-5 whitespace-pre-line">
              {tenant.welcomeMessage || `Bem-vindo ao ${tenant.name}`}
            </h1>
            <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              {tenant.description || "Transformando sua aparência com excelência e profissionalismo. Agende seu horário e viva uma experiência única."}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to={bookingUrl}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl shadow-lg active:scale-95 hover:opacity-90 transition-all bg-white"
                style={{ color: themeColor }}
              >
                <Calendar size={16} /> Agendar Agora
              </Link>
              {tenant.instagram && (
                <a
                  href={tenant.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20 transition-colors"
                >
                  <Instagram size={16} /> Instagram
                </a>
              )}
            </div>

            {/* Quick stats */}
            {(tenant.experienceYears || professionals.length > 0 || services.length > 0) && (
              <div className="flex flex-wrap gap-8 mt-10 pt-8 border-t border-white/10">
                {tenant.experienceYears && (
                  <div>
                    <p className="text-2xl font-black text-white">{tenant.experienceYears}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Anos</p>
                  </div>
                )}
                {professionals.length > 0 && (
                  <div>
                    <p className="text-2xl font-black text-white">{professionals.length}+</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Especialistas</p>
                  </div>
                )}
                {services.length > 0 && (
                  <div>
                    <p className="text-2xl font-black text-white">{services.length}+</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Serviços</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── QUEM SOMOS ─────────────────────────────────────────────────────────────── */}
      <section id="sobre" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-xl">
                {tenant.coverUrl || tenant.siteCoverUrl ? (
                  <img src={tenant.coverUrl || tenant.siteCoverUrl || ""} alt="Sobre nós" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-4 text-white"
                    style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #0f0f0f 100%)` }}
                  >
                    <Scissors size={48} className="opacity-30" />
                    <span className="text-lg font-black opacity-40 uppercase tracking-widest">{tenant.name}</span>
                  </div>
                )}
              </div>
              {tenant.experienceYears && (
                <div
                  className="absolute -bottom-5 -right-5 md:-bottom-8 md:-right-8 w-28 h-28 md:w-36 md:h-36 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center text-white shadow-xl"
                  style={{ backgroundColor: themeColor }}
                >
                  <span className="text-3xl md:text-4xl font-black leading-none">{tenant.experienceYears}</span>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1 text-center px-2">Anos de experiência</span>
                </div>
              )}
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                Quem Somos
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mb-5 leading-tight">
                {tenant.aboutTitle || "Nossa História"}
              </h2>
              <p className="text-zinc-500 text-base leading-relaxed mb-8 whitespace-pre-line">
                {tenant.description ||
                  `O ${tenant.name} nasceu da paixão pela beleza e pelo bem-estar. Buscamos oferecer não apenas um serviço, mas um momento de renovação para cada cliente.`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-zinc-100">
                {featureItems().map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-700">
                      {item.icon}
                    </div>
                    <h4 className="font-bold text-zinc-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ────────────────────────────────────────────────────────────────── */}
      {tenant.showServices !== false && (
        <section id="servicos" className="py-20 md:py-28 bg-zinc-50">
          <div className="max-w-6xl mx-auto px-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                  Especialidades
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">O que fazemos</h2>
              </div>
              <Link
                to={bookingUrl}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider hover:gap-3 transition-all shrink-0"
                style={{ color: themeColor }}
              >
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.length > 0 ? services.slice(0, 6).map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-zinc-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${themeColor}15` }}
                    >
                      <Scissors size={20} style={{ color: themeColor }} />
                    </div>
                    <h3 className="text-base font-black text-zinc-900 mb-1.5">{service.name}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-4 line-clamp-2">
                      {service.description || "Tratamento personalizado realizado por especialistas."}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-medium mb-5">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {service.duration} min
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-200" />
                      <span className="font-black text-zinc-800 text-sm">{priceStr(service.price)}</span>
                    </div>
                    <Link
                      to={bookingUrl}
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold border transition-colors hover:opacity-90 active:scale-95"
                      style={{ borderColor: themeColor, color: themeColor }}
                    >
                      <Calendar size={13} /> Agendar este serviço
                    </Link>
                  </div>
                </motion.div>
              )) : (
                <div className="col-span-full py-16 text-center">
                  <Scissors size={28} className="mx-auto mb-4 text-zinc-200" />
                  <p className="text-zinc-400 text-sm font-medium">Serviços disponíveis em breve.</p>
                </div>
              )}
            </div>

            {/* CTA Banner */}
            {services.length > 0 && (
              <div
                className="mt-10 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-white"
                style={{ backgroundColor: themeColor }}
              >
                <div>
                  <h3 className="text-xl font-black mb-1">Pronto para se cuidar?</h3>
                  <p className="text-white/70 text-sm">Escolha seu serviço favorito e agende em segundos.</p>
                </div>
                <Link
                  to={bookingUrl}
                  className="shrink-0 px-6 py-3 bg-white font-bold text-sm rounded-xl hover:bg-zinc-50 active:scale-95 transition-all shadow-md"
                  style={{ color: themeColor }}
                >
                  Ver todos os serviços
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── EQUIPE ──────────────────────────────────────────────────────────────────── */}
      {tenant.showTeam !== false && professionals.length > 0 && (
        <section id="equipe" className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-5">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                Time de Elite
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">Nossa Equipe</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {professionals.map((prof, i) => (
                <motion.div
                  key={prof.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex flex-col"
                >
                  {/* Photo */}
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-100 mb-3 relative">
                    {prof.photo ? (
                      <img
                        src={prof.photo}
                        alt={prof.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-4xl font-black text-white"
                        style={{ backgroundColor: themeColor }}
                      >
                        {prof.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-black text-zinc-900 text-sm leading-tight mb-0.5">{prof.name}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                      {prof.role || "Especialista"}
                    </p>
                  </div>

                  {/* Booking button — always visible, no hover required */}
                  <Link
                    to={`${bookingUrl}?profId=${prof.id}`}
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all hover:opacity-90 shadow-sm"
                    style={{ backgroundColor: themeColor }}
                  >
                    <Calendar size={12} />
                    Agendar com {prof.name.split(" ")[0]}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PRODUTOS ────────────────────────────────────────────────────────────────── */}
      {tenant.showProducts !== false && products.length > 0 && (
        <section id="produtos" className="py-20 md:py-28 bg-zinc-50">
          <div className="max-w-6xl mx-auto px-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                  Shop
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">Nossos Produtos</h2>
                <p className="text-zinc-500 text-sm mt-2 max-w-md">
                  Leve a experiência do nosso studio para sua casa com produtos selecionados.
                </p>
              </div>
              {cartCount > 0 && (
                <button
                  onClick={() => setCartOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg hover:opacity-90 active:scale-95 transition-all shrink-0"
                  style={{ backgroundColor: themeColor }}
                >
                  <ShoppingBag size={16} />
                  Ver Carrinho
                  <span className="w-5 h-5 rounded-full bg-white text-xs font-black flex items-center justify-center" style={{ color: themeColor }}>
                    {cartCount}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {products.map((product) => {
                const inCart = cartItems.find(i => i.product.id === product.id);
                return (
                  <div key={product.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 flex flex-col">
                    <div className="aspect-[4/3] overflow-hidden bg-zinc-100 relative">
                      {product.photo ? (
                        <img
                          src={product.photo}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                          <ShoppingBag size={32} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-0.5">
                        {product.brand || product.sector?.name || "Premium"}
                      </p>
                      <h3 className="font-bold text-zinc-900 text-sm line-clamp-2 flex-1">{product.name}</h3>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className="font-black text-zinc-900 text-sm">{priceStr(product.salePrice)}</span>
                        {inCart ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => changeQty(product.id, -1)}
                              className="w-6 h-6 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-black text-zinc-900 w-4 text-center">{inCart.quantity}</span>
                            <button
                              onClick={() => changeQty(product.id, 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors text-white"
                              style={{ backgroundColor: themeColor }}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all"
                            style={{ backgroundColor: themeColor }}
                          >
                            <Plus size={11} /> Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CARRINHO (Drawer lateral) ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {cartOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} style={{ color: themeColor }} />
                  <h2 className="font-black text-zinc-900">Carrinho</h2>
                  {cartCount > 0 && (
                    <span className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ backgroundColor: themeColor }}>
                      {cartCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
                    <ShoppingBag size={40} className="opacity-30" />
                    <p className="text-sm font-medium">Carrinho vazio</p>
                  </div>
                ) : (
                  cartItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                      {product.photo ? (
                        <img src={product.photo} alt={product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0 text-zinc-400">
                          <ShoppingBag size={16} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 line-clamp-1">{product.name}</p>
                        {product.brand && <p className="text-[10px] text-zinc-400 font-medium">{product.brand}</p>}
                        <p className="text-xs font-black" style={{ color: themeColor }}>{priceStr(product.salePrice)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => changeQty(product.id, -1)}
                          className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center hover:border-zinc-400 transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-sm font-black text-zinc-900 w-5 text-center">{quantity}</span>
                        <button
                          onClick={() => changeQty(product.id, 1)}
                          className="w-6 h-6 rounded-md text-white flex items-center justify-center transition-colors"
                          style={{ backgroundColor: themeColor }}
                        >
                          <Plus size={10} />
                        </button>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-300 transition-colors ml-1"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {cartItems.length > 0 && (
                <div className="px-5 py-5 border-t border-zinc-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500 font-medium">Total</span>
                    <span className="text-xl font-black text-zinc-900">{priceStr(cartTotal)}</span>
                  </div>
                  {tenant.phone ? (
                    <button
                      onClick={handleCartWhatsapp}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg"
                      style={{ backgroundColor: "#25D366" }}
                    >
                      <MessageCircle size={18} />
                      Enviar pedido pelo WhatsApp
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-400 text-center">Entre em contato para finalizar o pedido.</p>
                  )}
                  <button
                    onClick={() => setCartItems([])}
                    className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    Limpar carrinho
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── FOOTER ──────────────────────────────────────────────────────────────────── */}
      <footer className="bg-zinc-950 text-white">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-24 md:pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 object-contain rounded-lg" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
                    <Scissors size={15} className="text-white" />
                  </div>
                )}
                <span className="font-black text-base">{tenant.name}</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed mb-5">
                {tenant.description ? tenant.description.slice(0, 100) + (tenant.description.length > 100 ? "..." : "") : "Referência em beleza e bem-estar."}
              </p>
              <div className="flex gap-3">
                {tenant.instagram && (
                  <a href={tenant.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    <Instagram size={15} />
                  </a>
                )}
                {tenant.phone && (
                  <a href={`tel:${tenant.phone}`} className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    <Phone size={15} />
                  </a>
                )}
              </div>
            </div>

            {/* Nav */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Navegação</h4>
              <ul className="space-y-2.5 text-sm text-zinc-500">
                <li><a href="#sobre"    className="hover:text-white transition-colors">Quem Somos</a></li>
                {tenant.showServices !== false && <li><a href="#servicos" className="hover:text-white transition-colors">Serviços</a></li>}
                {tenant.showProducts !== false && products.length > 0 && <li><a href="#produtos" className="hover:text-white transition-colors">Produtos</a></li>}
                {tenant.showTeam !== false && <li><a href="#equipe" className="hover:text-white transition-colors">Equipe</a></li>}
              </ul>
            </div>

            {/* Info */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Informações</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                {tenant.address && (
                  <li className="flex items-start gap-2">
                    <MapPin size={15} className="shrink-0 text-zinc-400 mt-0.5" />
                    <span>{tenant.address}</span>
                  </li>
                )}
                {tenant.phone && (
                  <li className="flex items-center gap-2">
                    <Phone size={15} className="shrink-0 text-zinc-400" />
                    <span>{tenant.phone}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Clock size={15} className="shrink-0 text-zinc-400" />
                  <span>Seg–Sáb: 09h às 20h</span>
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div>
              <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900">
                <h4 className="font-black text-base mb-2">Agende agora</h4>
                <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Escolha seu profissional e serviço favorito em segundos.</p>
                <Link
                  to={bookingUrl}
                  className="flex items-center justify-center gap-2 w-full py-3 font-bold text-sm rounded-xl text-zinc-950 hover:bg-zinc-100 active:scale-95 transition-all bg-white"
                >
                  <Calendar size={14} /> Ir para Agenda
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} {tenant.name} · Desenvolvido por <span className="text-zinc-400">Agendelle</span>
            </p>
            <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              <Link to={`/${slug}/privacidade`} className="hover:text-zinc-400 transition-colors">Privacidade</Link>
              <Link to={`/${slug}/termos`} className="hover:text-zinc-400 transition-colors">Termos</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── FLOATING CTA (mobile only) ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className={`p-3 bg-white/95 backdrop-blur-md border-t border-zinc-100 shadow-xl ${cartCount > 0 ? "flex gap-2" : ""}`}>
          {cartCount > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all shrink-0"
              style={{ backgroundColor: themeColor }}
            >
              <ShoppingBag size={16} />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            </button>
          )}
          <Link
            to={bookingUrl}
            className="flex items-center justify-center gap-2 flex-1 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
            style={{ backgroundColor: cartCount > 0 ? "#18181b" : themeColor }}
          >
            <Calendar size={16} /> Agendar Horário
          </Link>
        </div>
      </div>

    </div>
  );
}
