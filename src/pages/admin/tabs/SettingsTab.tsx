import React, { useState } from "react";
import { Store, Phone, MapPin, Palette, AlertTriangle, ChevronRight, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { motion, AnimatePresence } from "motion/react";

interface SettingsTabProps {
  currentTheme: any;
  themeColors: any[];
  themeColor: string;
  handleThemeChange: (val: string) => void;
  settingsOpenCard: string | null;
  setSettingsOpenCard: (val: string | null) => void;
}

export function SettingsTab({
  currentTheme,
  themeColors,
  themeColor,
  handleThemeChange,
}: SettingsTabProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const cards = [
    {
      id: 'studio',
      icon: <Store size={22} />,
      iconBg: 'bg-blue-50 border-blue-100',
      iconColor: 'text-blue-600',
      title: 'Informações do Studio',
      subtitle: 'Altere nome, contato e endereço principal',
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Store size={10}/> Nome do Negócio</label>
            <input type="text" defaultValue="Agendelle" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Phone size={10}/> Telefone</label>
            <input type="text" defaultValue="(11) 99999-9999" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10}/> Endereço</label>
            <input type="text" defaultValue="Rua das Flores, 123 - Centro" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
          </div>
          <Button onClick={() => setActiveModal(null)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-3 font-bold shadow-sm mt-2">
            Salvar Informações
          </Button>
        </div>
      )
    },
    {
      id: 'tema',
      icon: <Palette size={22} />,
      iconBg: 'border',
      iconColor: '',
      iconStyle: { background: currentTheme.light, borderColor: currentTheme.border },
      iconInner: <div className="w-5 h-5 rounded-full" style={{ background: currentTheme.hex }} />,
      title: 'Personalização de Cor',
      subtitle: `Botões e tons do sistema (${currentTheme.label})`,
      content: (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {themeColors.map(color => (
              <button
                key={color.value}
                onClick={() => handleThemeChange(color.value)}
                title={color.label}
                className="relative flex flex-col items-center gap-2 transition-all"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full shadow-md transition-all duration-200",
                    themeColor === color.value
                      ? "scale-110 ring-2 ring-offset-2 ring-zinc-800"
                      : "hover:scale-110 hover:shadow-lg"
                  )}
                  style={{ background: color.hex }}
                >
                  {themeColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest", themeColor === color.value ? "text-zinc-800" : "text-zinc-400")}>{color.label}</span>
              </button>
            ))}
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Pré-visualização</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm" style={{ background: currentTheme.hex }}>Botão Principal</button>
              <button className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }}>Secundário</button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold" style={{ background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }}>
                <div className="w-2 h-2 rounded-full" style={{ background: currentTheme.hex }} />Badge
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold bg-zinc-100 p-3 rounded-lg flex items-center gap-2">
            <span className="text-zinc-500 shrink-0">✓</span> A cor é salva e aplicada imediatamente em toda a interface do painel.
          </p>
        </div>
      )
    },
    {
      id: 'perigo',
      icon: <AlertTriangle size={22} />,
      iconBg: 'bg-red-50 border-red-100',
      iconColor: 'text-red-500',
      title: 'Zona de Perigo',
      subtitle: 'Ações destrutivas e avançadas da conta',
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Atenção
            </p>
            <p className="text-[11px] text-red-500/80 font-medium leading-relaxed">As ações abaixo são irreversíveis. Ao formatar seu banco de dados, todos os seus clientes, comandas, finanças e registros de agendamentos serão perdidos permanentemente.</p>
          </div>
          <button className="w-full py-4 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all uppercase tracking-widest shadow-sm">
            Limpar Banco de Dados
          </button>
        </div>
      )
    }
  ];

  const activeModalData = cards.find(c => c.id === activeModal);

  return (
    <div className="max-w-5xl">
      <h3 className="text-lg font-black text-zinc-900 mb-6 px-1">Configurações Gerais</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => setActiveModal(card.id)}
            className="group relative bg-white rounded-3xl p-6 border border-zinc-200 flex flex-col items-start gap-4 hover:border-zinc-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-left overflow-hidden overflow-visible"
          >
            {card.id === 'perigo' && (
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-red-500/5 blur-2xl rounded-full pointer-events-none" />
            )}
            <div className={cn("p-3 rounded-2xl border shadow-sm shrink-0 transition-transform group-hover:scale-110", card.iconBg, card.iconColor)} style={card.iconStyle}>
              {card.iconInner || card.icon}
            </div>
            <div>
              <h4 className="text-sm font-black text-zinc-900">{card.title}</h4>
              <p className="text-[10px] text-zinc-400 font-bold tracking-wide mt-1 leading-relaxed line-clamp-2">{card.subtitle}</p>
            </div>
            
            <div className="mt-auto pt-4 w-full flex justify-end">
               <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all">
                  <ChevronRight size={14} />
               </div>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeModal && activeModalData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
                <div className={cn("p-2.5 rounded-xl border shrink-0 shadow-sm", activeModalData.iconBg, activeModalData.iconColor)} style={activeModalData.iconStyle}>
                  {activeModalData.iconInner || activeModalData.icon}
                </div>
                <div className="flex-1 pr-6">
                  <h3 className="text-base font-black text-zinc-900 leading-tight">{activeModalData.title}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-1 line-clamp-1">{activeModalData.subtitle}</p>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="absolute right-6 top-6 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors z-10"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto">
                {activeModalData.content}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
