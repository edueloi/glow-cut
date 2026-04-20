import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import logoImg from "../images/system/imagem-agendele.png";
import faviconImg from "../images/system/logo-favicon.png";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  _count?: { posts: number };
}

interface BlogAuthor {
  id: string;
  name: string;
  slug: string;
  photo?: string;
  role?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  featured: boolean;
  tags: string;
  views: number;
  readTimeMinutes: number;
  publishedAt?: string;
  category?: BlogCategory;
  author?: BlogAuthor;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags) || []; } catch { return []; }
}

/* ─── Componentes internos ─────────────────────────────────────────────────── */
function Navbar({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.96)" : "#fff",
      boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? "1px solid #f3f4f6" : "1px solid #f3f4f6",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <img src={faviconImg} alt="Agendelle" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span style={{ fontWeight: 900, fontSize: 18, color: "#111" }}>Agendelle</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.12em", marginLeft: 2 }}>Blog</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#6b7280", padding: "8px 14px", borderRadius: 10 }}>
            Início
          </button>
          <button onClick={() => navigate("/login")} style={{ background: "#f59e0b", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff", padding: "8px 20px", borderRadius: 10 }}>
            Entrar
          </button>
        </div>
      </div>
    </nav>
  );
}

function NewsletterBanner({ onSubscribe }: { onSubscribe: (email: string, name: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      setMsg(data.message || "Inscrito com sucesso!");
      setEmail("");
      setName("");
      onSubscribe(email, name);
    } catch {
      setMsg("Erro ao inscrever. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      borderRadius: 20, padding: "40px 40px", color: "#fff",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.8 }}>Newsletter</p>
        <h3 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 4px" }}>Conteúdo exclusivo para o seu negócio de beleza</h3>
        <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>Dicas de gestão, marketing e crescimento direto na sua caixa de entrada.</p>
      </div>
      {msg ? (
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: "14px 20px", fontWeight: 700, fontSize: 14 }}>
          {msg}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              style={{ flex: 1, minWidth: 140, padding: "12px 16px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.95)", color: "#111", outline: "none" }}
            />
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="Seu e-mail"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ flex: 2, minWidth: 180, padding: "12px 16px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.95)", color: "#111", outline: "none" }}
            />
            <button
              onClick={handleSubmit} disabled={loading || !email}
              style={{ padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: "#111", color: "#fff", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}
            >
              {loading ? "..." : "Assinar →"}
            </button>
          </div>
          <p style={{ fontSize: 11, opacity: 0.75 }}>Sem spam. Cancele quando quiser.</p>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const navigate = useNavigate();
  const tags = parseTags(post.tags);

  if (featured) {
    return (
      <div
        onClick={() => navigate(`/blog/${post.slug}`)}
        className="featured-card"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.12)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.07)"; }}
      >
        <div style={{ position: "relative", minHeight: 280 }}>
          {post.coverImage ? (
            <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", minHeight: 280, background: "linear-gradient(135deg, #fef3c7, #fde68a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 48 }}>✂️</span>
            </div>
          )}
          {post.featured && (
            <div style={{ position: "absolute", top: 16, left: 16, background: "#f59e0b", color: "#fff", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 6 }}>
              ★ Destaque
            </div>
          )}
        </div>
        <div className="featured-card-content">
          {post.category && (
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: post.category.color || "#f59e0b" }}>
              {post.category.name}
            </span>
          )}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1.3, margin: 0 }}>{post.title}</h2>
          {post.excerpt && <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{post.excerpt}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            {post.author && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {post.author.photo ? (
                  <img src={post.author.photo} alt={post.author.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#d97706" }}>
                    {post.author.name[0]}
                  </div>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{post.author.name}</span>
              </div>
            )}
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatDate(post.publishedAt)}</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{post.readTimeMinutes} min</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/blog/${post.slug}`)}
      style={{
        cursor: "pointer", borderRadius: 16, overflow: "hidden",
        background: "#fff", border: "1px solid #f3f4f6",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)"; }}
    >
      <div style={{ position: "relative", height: 180 }}>
        {post.coverImage ? (
          <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #fef3c7, #fde68a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 36 }}>✂️</span>
          </div>
        )}
        {post.category && (
          <span style={{
            position: "absolute", bottom: 12, left: 12,
            background: post.category.color || "#f59e0b", color: "#fff",
            fontSize: 10, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 5,
          }}>
            {post.category.name}
          </span>
        )}
      </div>
      <div style={{ padding: "20px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111", lineHeight: 1.4, margin: 0 }}>{post.title}</h3>
        {post.excerpt && (
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {post.excerpt}
          </p>
        )}
        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {post.author && (
              <>
                {post.author.photo ? (
                  <img src={post.author.photo} alt={post.author.name} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#d97706" }}>
                    {post.author.name[0]}
                  </div>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{post.author.name}</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>{formatDate(post.publishedAt)}</span>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>{post.readTimeMinutes} min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function BlogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featured, setFeatured] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const page = Number(searchParams.get("page") || 1);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  const [searchInput, setSearchInput] = useState(search);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "9");
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const res = await fetch(`/api/blog/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {}
    setLoading(false);
  }, [page, search, category]);

  const fetchFeatured = useCallback(async () => {
    if (page > 1 || search || category) return;
    try {
      const res = await fetch("/api/blog/posts/featured");
      const data = await res.json();
      setFeatured(Array.isArray(data) ? data.slice(0, 1) : []);
    } catch {}
  }, [page, search, category]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { fetchPosts(); fetchFeatured(); fetchCategories(); }, [fetchPosts, fetchFeatured, fetchCategories]);

  const handleSearch = () => {
    const p = new URLSearchParams(searchParams);
    if (searchInput) p.set("search", searchInput);
    else p.delete("search");
    p.delete("page");
    setSearchParams(p);
  };

  const setCategory = (slug: string) => {
    const p = new URLSearchParams(searchParams);
    if (slug) p.set("category", slug);
    else p.delete("category");
    p.delete("page");
    setSearchParams(p);
  };

  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams);
    p.set("page", String(n));
    setSearchParams(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showHero = page === 1 && !search && !category;
  const featuredPost = featured[0];

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', sans-serif" }}>
      <Navbar onNavigate={navigate} />

      {/* ── Hero / Header ─────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 68 }}>
        <div style={{
          background: "linear-gradient(160deg, #fffbeb 0%, #fff 60%)",
          borderBottom: "1px solid #f3f4f6", padding: "60px 24px 48px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#f59e0b" }}>Blog Agendelle</span>
              <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#111", margin: "10px 0 12px", lineHeight: 1.2 }}>
                Conteúdo para fazer seu<br /><span style={{ color: "#f59e0b" }}>negócio crescer</span>
              </h1>
              <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 520, margin: "0 auto" }}>
                Dicas de gestão, marketing digital, atendimento e muito mais para salões, barbearias e clínicas de beleza.
              </p>
            </div>

            {/* Search bar */}
            <div style={{ maxWidth: 560, margin: "0 auto 24px", display: "flex", gap: 8 }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Buscar artigos..."
                style={{ flex: 1, padding: "13px 18px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 13, fontWeight: 500, background: "#fff", outline: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              />
              <button
                onClick={handleSearch}
                style={{ padding: "13px 24px", borderRadius: 12, border: "none", cursor: "pointer", background: "#f59e0b", color: "#fff", fontWeight: 800, fontSize: 13 }}
              >
                Buscar
              </button>
            </div>

            {/* Categories filter */}
            {categories.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  onClick={() => setCategory("")}
                  style={{
                    padding: "6px 14px", borderRadius: 20, border: `2px solid ${!category ? "#f59e0b" : "#e5e7eb"}`,
                    background: !category ? "#f59e0b" : "#fff", color: !category ? "#fff" : "#374151",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.slug)}
                    style={{
                      padding: "6px 14px", borderRadius: 20, border: `2px solid ${category === cat.slug ? cat.color : "#e5e7eb"}`,
                      background: category === cat.slug ? cat.color : "#fff",
                      color: category === cat.slug ? "#fff" : "#374151",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {cat.name}
                    {cat._count && <span style={{ marginLeft: 4, opacity: 0.7 }}>({cat._count.posts})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>

          {/* Featured post */}
          {showHero && featuredPost && (
            <div style={{ marginBottom: 48 }}>
              <PostCard post={featuredPost} featured />
            </div>
          )}

          {/* Active filters */}
          {(search || category) && (
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                {total} resultado{total !== 1 ? "s" : ""}
                {search && <> para "<strong>{search}</strong>"</>}
                {category && ` na categoria "${categories.find(c => c.slug === category)?.name || category}"`}
              </span>
              <button
                onClick={() => { setSearchInput(""); setSearchParams({}); }}
                style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "#fef2f2", border: "none", cursor: "pointer", padding: "3px 10px", borderRadius: 6 }}
              >
                Limpar filtros
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid #f3f4f6" }}>
                  <div style={{ height: 180, background: "#f3f4f6", animation: "pulse 1.5s infinite" }} />
                  <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ height: 14, background: "#f3f4f6", borderRadius: 6, width: "80%" }} />
                    <div style={{ height: 10, background: "#f3f4f6", borderRadius: 6, width: "60%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <p style={{ fontSize: 16, fontWeight: 700 }}>Nenhum artigo encontrado</p>
              <p style={{ fontSize: 13 }}>Tente outro termo ou categoria</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
              {posts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 48 }}>
              <button
                onClick={() => setPage(page - 1)} disabled={page <= 1}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, fontSize: 13, fontWeight: 700 }}
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, page - 2) + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p} onClick={() => setPage(p)}
                    style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${p === page ? "#f59e0b" : "#e5e7eb"}`, background: p === page ? "#f59e0b" : "#fff", color: p === page ? "#fff" : "#374151", cursor: "pointer", fontWeight: 800, fontSize: 13 }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)} disabled={page >= totalPages}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1, fontSize: 13, fontWeight: 700 }}
              >
                Próximo →
              </button>
            </div>
          )}

          {/* Newsletter */}
          <div style={{ marginTop: 64 }}>
            <NewsletterBanner onSubscribe={() => {}} />
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#111", color: "#9ca3af", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={faviconImg} alt="Agendelle" style={{ width: 24, height: 24, filter: "brightness(0) invert(1)", opacity: 0.5 }} />
            <span style={{ fontWeight: 900, color: "#fff" }}>Agendelle</span>
          </div>
          <p style={{ fontSize: 12 }}>© 2026 Agendelle. Todos os direitos reservados.</p>
          <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>Início</button>
            <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>Entrar</button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        
        .featured-card {
          cursor: pointer;
          border-radius: 20px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #f3f4f6;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .featured-card-content {
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .featured-card {
            grid-template-columns: 1fr;
          }
          .featured-card-content {
            padding: 24px;
          }
          .featured-card img {
            height: 200px !important;
          }
        }
      `}</style>
    </div>
  );
}
