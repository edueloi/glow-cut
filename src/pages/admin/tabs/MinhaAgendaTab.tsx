import React from "react";
import { Globe, Copy, ExternalLink, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

interface MinhaAgendaTabProps {
  studioName?: string;
  themeColor?: string;
}

export function MinhaAgendaTab({ studioName = "Glow & Cut", themeColor = "#f59e0b" }: MinhaAgendaTabProps) {
  // Formata o nome para a URL (slug)
  const slug = studioName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const link = `glow-cut.com.br/agendar/${slug}`;

  return (
    <div className="space-y-6 max-w-4xl pb-10 flex flex-col h-full overflow-y-auto pr-2 scrollbar-hide">
      {/* Intro */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
          <Globe className="text-emerald-500" size={24} />
          Minha Agenda Online
        </h3>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          Esta é a página pública do seu estúdio. Seus clientes acessarão este link para agendar horários diretamente com você, <strong className="text-zinc-700">sem precisar fazer login</strong>. O link e os textos são gerados automaticamente com base no nome do estabelecimento.
        </p>
      </div>

      {/* Link de Compartilhamento */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><LinkIcon size={12}/> Seu Link de Agendamento Oficial</p>
          <p className="text-xl font-black text-zinc-900 mt-1">{link}</p>
        </div>
        <div className="flex gap-3 shrink-0 relative z-10">
          <button className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-50 shadow-sm transition-all focus:ring-2 focus:ring-emerald-500/20 outline-none">
            <Copy size={16} /> Copiar Link
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all focus:ring-2 focus:ring-emerald-500/20 outline-none">
            <ExternalLink size={16} /> Abrir Agenda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações de SEO */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5 flex flex-col">
          <h4 className="text-sm font-black text-zinc-800 border-b border-zinc-100 pb-3">Otimização e SEO (Buscas)</h4>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">URL Personalizada (Slug)</label>
            <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
              <span className="px-3 py-3 text-xs font-bold text-zinc-400 border-r border-zinc-200 whitespace-nowrap">glow-cut.com.br/agendar/</span>
              <input type="text" defaultValue={slug} className="w-full text-xs p-3 bg-transparent text-zinc-800 font-bold outline-none" />
            </div>
            <p className="text-[9px] text-zinc-400">O final do link da sua página. Geralmente o nome do estúdio.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Título da Página (Meta Title)</label>
            <input type="text" defaultValue={`${studioName} | Agende seu horário`} className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all" />
            <p className="text-[9px] text-zinc-400">Título principal no Google e na aba do navegador.</p>
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descrição Breve (Meta Description)</label>
            <textarea rows={4} defaultValue={`Agende rapidamente seu corte ou procedimento no ${studioName}. Profissionais qualificados e um ambiente preparado para você.`} className="w-full flex-1 text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all resize-none" />
            <p className="text-[9px] text-zinc-400">Texto que aparece nas redes sociais (WhatsApp) e no Google abaixo do título.</p>
          </div>
        </div>

        {/* Aparência do Template */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
          <h4 className="text-sm font-black text-zinc-800 border-b border-zinc-100 pb-3">Aparência do Site</h4>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mensagem de Boas Vindas</label>
            <input type="text" defaultValue="Bem-vindo ao nosso agendamento online!" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Logo do Estúdio</label>
              <div className="flex flex-col gap-3">
                <div className="h-32 rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:border-emerald-400 hover:text-emerald-500 transition-all cursor-pointer relative overflow-hidden group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <ImageIcon size={18} />
                  </div>
                  <p className="text-[10px] font-bold">Enviar Logo</p>
                  <p className="text-[8px] mt-0.5">Quadrado • PNG</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Imagem de Fundo (Capa)</label>
              <div className="flex flex-col gap-3">
                <div className="h-32 rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:border-emerald-400 hover:text-emerald-500 transition-all cursor-pointer relative overflow-hidden group">
                  <ImageIcon size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[10px] font-bold">Fazer Upload</p>
                  <p className="text-[8px] mt-0.5">Horizontal • JPG</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
              Cor Principal (Tema)
            </label>
            <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
               <input type="color" defaultValue="#09090b" className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
               <div className="flex-1">
                 <input type="text" defaultValue="#09090b" className="w-full bg-transparent text-xs font-bold text-zinc-700 outline-none uppercase" />
               </div>
               <span className="text-[9px] text-zinc-400 font-bold uppercase">Cor dos botões</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
             <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
              Login Necessário?
            </label>
            <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-200">
               <span className="text-xs font-bold text-zinc-500 line-through">Exigir login do cliente</span>
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-md">Login Livre</span>
            </div>
            <p className="text-[9px] text-zinc-400">Atualmente o sistema não exige login para aumentar suas conversões.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-start pt-2">
        <Button className="bg-emerald-500 hover:bg-emerald-600 px-10 text-white rounded-xl py-4 font-bold shadow-lg shadow-emerald-500/20 text-sm">
          Salvar Configurações da Agenda
        </Button>
      </div>
    </div>
  );
}
