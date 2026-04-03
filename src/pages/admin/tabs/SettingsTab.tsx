import React from "react";
import { Store, Phone, MapPin, Palette, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";

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
  settingsOpenCard,
  setSettingsOpenCard
}: SettingsTabProps) {
  return (
    <div className="max-w-2xl space-y-3">
      {/* Card: Informações do Studio */}
      {[
        {
          id: 'studio',
          icon: <Store size={18} />,
          iconBg: 'bg-blue-50 border-blue-100',
          iconColor: 'text-blue-600',
          title: 'Informações do Studio',
          subtitle: 'Nome, contato e endereço',
          content: (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Store size={10}/> Nome do Studio</label>
                <input type="text" defaultValue="Glow & Cut Studio" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Phone size={10}/> Telefone</label>
                <input type="text" defaultValue="(11) 99999-9999" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10}/> Endereço</label>
                <input type="text" defaultValue="Rua das Flores, 123 - Centro" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
              </div>
              <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-3 font-bold shadow-sm">
                Salvar Informações
              </Button>
            </div>
          )
        },
        {
          id: 'tema',
          icon: <Palette size={18} />,
          iconBg: 'border',
          iconColor: '',
          iconStyle: { background: currentTheme.light, borderColor: currentTheme.border },
          iconInner: <div className="w-4 h-4 rounded-full" style={{ background: currentTheme.hex }} />,
          title: 'Personalização de Tema',
          subtitle: `Cor atual: ${currentTheme.label}`,
          content: (
            <div className="space-y-5 pt-2">
              <div className="flex flex-wrap gap-3">
                {themeColors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => handleThemeChange(color.value)}
                    title={color.label}
                    className="relative flex flex-col items-center gap-1.5 transition-all"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full shadow-md transition-all duration-200",
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
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", themeColor === color.value ? "text-zinc-800" : "text-zinc-400")}>{color.label}</span>
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
              <p className="text-[9px] text-zinc-400">✓ A cor é salva e aplicada imediatamente em toda a interface.</p>
            </div>
          )
        },
        {
          id: 'perigo',
          icon: <AlertTriangle size={18} />,
          iconBg: 'bg-red-50 border-red-100',
          iconColor: 'text-red-500',
          title: 'Zona de Perigo',
          subtitle: 'Ações irreversíveis',
          content: (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] text-zinc-500 leading-relaxed">Estas ações não podem ser desfeitas. Tenha certeza antes de continuar.</p>
              <button className="w-full py-3 rounded-xl text-[10px] font-bold border border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all uppercase tracking-widest">
                Limpar Banco de Dados
              </button>
            </div>
          )
        }
      ].map(card => (
        <div key={card.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center gap-4 p-5 text-left hover:bg-zinc-50/70 transition-colors"
            onClick={() => setSettingsOpenCard(settingsOpenCard === card.id ? null : card.id)}
          >
            <div className={cn("p-2.5 rounded-xl border", card.iconBg, card.iconColor)} style={card.iconStyle}>
              {card.iconInner || card.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-900">{card.title}</p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{card.subtitle}</p>
            </div>
            <ChevronDown
              size={16}
              className={cn("text-zinc-400 transition-transform duration-200", settingsOpenCard === card.id && "rotate-180")}
            />
          </button>
          {settingsOpenCard === card.id && (
            <div className="px-5 pb-5 border-t border-zinc-100">
              {card.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
