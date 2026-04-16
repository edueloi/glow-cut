/**
 * Catálogo de serviços padrão para salões, barbearias, manicures,
 * pedicures, estéticas e nichos relacionados.
 *
 * O usuário pode importar qualquer serviço deste catálogo com um clique
 * ou criar serviços personalizados do zero.
 */

export interface CatalogService {
  name: string;
  duration: number; // minutos
  price: number;    // sugerido
}

export interface CatalogCategory {
  category: string;
  icon: string;      // emoji
  services: CatalogService[];
}

export const SERVICE_CATALOG: CatalogCategory[] = [
  {
    category: "Barba e Bigode",
    icon: "🧔",
    services: [
      { name: "Barba", duration: 30, price: 35 },
      { name: "Barba com Máquina", duration: 20, price: 25 },
      { name: "Barba Modelada", duration: 40, price: 45 },
      { name: "Barba Tradicional", duration: 30, price: 35 },
      { name: "Bigode com Máquina", duration: 15, price: 15 },
      { name: "Bigode Modelado", duration: 20, price: 20 },
      { name: "Bigode Tradicional", duration: 20, price: 20 },
      { name: "Contorno de Barba", duration: 20, price: 25 },
      { name: "Ecobarba", duration: 30, price: 40 },
      { name: "Toalha Quente", duration: 15, price: 10 },
    ],
  },
  {
    category: "Cabelo",
    icon: "✂️",
    services: [
      { name: "Corte Masculino", duration: 30, price: 45 },
      { name: "Corte Masculino Simples", duration: 20, price: 35 },
      { name: "Corte Feminino", duration: 45, price: 65 },
      { name: "Corte Feminino Simples", duration: 30, price: 50 },
      { name: "Corte Infantil", duration: 20, price: 30 },
      { name: "Corte a Máquina", duration: 20, price: 30 },
      { name: "Corte - Franja", duration: 15, price: 20 },
      { name: "Corte Modelado", duration: 40, price: 55 },
      { name: "Escova Simples", duration: 30, price: 35 },
      { name: "Escova Progressiva", duration: 120, price: 200 },
      { name: "Escova Progressiva sem Formol", duration: 120, price: 220 },
      { name: "Escova Botox", duration: 90, price: 180 },
      { name: "Escova Definitiva", duration: 120, price: 250 },
      { name: "Escova e Prancha", duration: 60, price: 80 },
      { name: "Escova Modelada", duration: 45, price: 65 },
      { name: "Escova Francesa", duration: 45, price: 70 },
      { name: "Hidratação", duration: 45, price: 60 },
      { name: "Hidratação Simples", duration: 30, price: 45 },
      { name: "Hidratação com Ampolas", duration: 45, price: 70 },
      { name: "Cauterização Capilar", duration: 60, price: 120 },
      { name: "Coloração / Tonalização", duration: 60, price: 100 },
      { name: "Luzes", duration: 90, price: 180 },
      { name: "Mechas", duration: 90, price: 180 },
      { name: "Mechas Californianas", duration: 90, price: 200 },
      { name: "Balaiagem", duration: 90, price: 220 },
      { name: "Ombré Hair", duration: 90, price: 200 },
      { name: "Decapagem / Descoloração", duration: 60, price: 150 },
      { name: "Retoque de Raiz", duration: 45, price: 80 },
      { name: "Reflexo", duration: 60, price: 120 },
      { name: "Permanente", duration: 90, price: 160 },
      { name: "Relaxamento Capilar", duration: 60, price: 130 },
      { name: "Lavagem/Shampoo", duration: 15, price: 25 },
      { name: "Lavagem/Shampoo + Secagem", duration: 30, price: 40 },
      { name: "Secagem", duration: 20, price: 25 },
      { name: "Mega Hair / Alongamento", duration: 180, price: 400 },
      { name: "Nutrição Capilar", duration: 45, price: 65 },
      { name: "Reconstrução Capilar", duration: 60, price: 100 },
    ],
  },
  {
    category: "Cabelo - Penteados",
    icon: "👰",
    services: [
      { name: "Penteado", duration: 60, price: 120 },
      { name: "Penteado de Noiva", duration: 120, price: 300 },
      { name: "Penteado Preso", duration: 45, price: 90 },
      { name: "Penteado Solto", duration: 40, price: 80 },
      { name: "Tranças", duration: 60, price: 100 },
      { name: "Baby Liss / Cachos", duration: 50, price: 80 },
      { name: "Coques", duration: 45, price: 80 },
    ],
  },
  {
    category: "Manicure",
    icon: "💅",
    services: [
      { name: "Manicure", duration: 45, price: 40 },
      { name: "Manicure - Esmalte Nacional", duration: 45, price: 35 },
      { name: "Manicure - Esmalte Importado", duration: 45, price: 50 },
      { name: "Manicure - Esmaltação em Gel", duration: 60, price: 60 },
      { name: "Manicure - Esfoliação", duration: 60, price: 55 },
      { name: "Manicure - Hidratação Cutículas", duration: 15, price: 20 },
      { name: "Manicure - Spa das Mãos", duration: 60, price: 70 },
      { name: "Manicure - Quick Massage (20 min)", duration: 20, price: 25 },
    ],
  },
  {
    category: "Pedicure",
    icon: "🦶",
    services: [
      { name: "Pedicure", duration: 50, price: 45 },
      { name: "Pedicure - Esmalte Nacional", duration: 50, price: 40 },
      { name: "Pedicure - Esmalte Importado", duration: 50, price: 55 },
      { name: "Pedicure - Gel Top Gloss", duration: 60, price: 65 },
      { name: "Pedicure - Reflexologia", duration: 70, price: 75 },
    ],
  },
  {
    category: "Mãos e Pés",
    icon: "✋",
    services: [
      { name: "Manicure e Pedicure", duration: 90, price: 80 },
      { name: "Manicure e Pedicure - Francesinha", duration: 100, price: 90 },
      { name: "Spa das Mãos", duration: 60, price: 70 },
      { name: "Spa dos Pés", duration: 60, price: 70 },
      { name: "Esmaltação", duration: 30, price: 25 },
      { name: "Esmaltação Infantil", duration: 20, price: 20 },
      { name: "Hidratação da Mão", duration: 20, price: 25 },
      { name: "Hidratação do Pé", duration: 20, price: 25 },
    ],
  },
  {
    category: "Unhas Artificiais",
    icon: "💎",
    services: [
      { name: "Unhas de Gel - Colocação", duration: 90, price: 120 },
      { name: "Unhas de Gel - Manutenção", duration: 60, price: 80 },
      { name: "Unhas Acrílicas - Colocação", duration: 90, price: 130 },
      { name: "Unhas Acrílicas - Manutenção", duration: 60, price: 90 },
      { name: "Unhas de Fibra de Vidro - Colocação", duration: 90, price: 140 },
      { name: "Unhas de Fibra de Vidro - Manutenção", duration: 60, price: 90 },
      { name: "Unhas Postiças - Colocação", duration: 45, price: 60 },
      { name: "Remoção de Unhas Artificiais", duration: 45, price: 40 },
    ],
  },
  {
    category: "Sobrancelha",
    icon: "🪮",
    services: [
      { name: "Design de Sobrancelha", duration: 30, price: 35 },
      { name: "Manutenção de Design", duration: 20, price: 25 },
      { name: "Sobrancelha com Linha", duration: 20, price: 25 },
      { name: "Sobrancelha na Cera", duration: 15, price: 20 },
      { name: "Sobrancelha na Pinça", duration: 20, price: 25 },
      { name: "Pintura Sobrancelhas - Henna", duration: 45, price: 60 },
      { name: "Pintura Sobrancelhas - Tinta", duration: 30, price: 45 },
      { name: "Pintura Sobrancelhas com Refectocil", duration: 30, price: 50 },
      { name: "Alisamento de Sobrancelhas", duration: 30, price: 55 },
    ],
  },
  {
    category: "Cílios",
    icon: "👁️",
    services: [
      { name: "Extensão de Cílios", duration: 90, price: 150 },
      { name: "Manutenção de Cílios", duration: 60, price: 100 },
      { name: "Permanente de Cílios", duration: 60, price: 90 },
      { name: "Pintura de Cílios", duration: 30, price: 40 },
      { name: "Colocação de Cílios Postiços", duration: 30, price: 35 },
    ],
  },
  {
    category: "Maquiagem",
    icon: "💄",
    services: [
      { name: "Maquiagem", duration: 60, price: 120 },
      { name: "Maquiagem de Noiva", duration: 120, price: 350 },
      { name: "Micropigmentação", duration: 120, price: 400 },
      { name: "Maquiagem Definitiva", duration: 90, price: 300 },
      { name: "Maquiagem Definitiva - Lábios", duration: 90, price: 280 },
      { name: "Maquiagem Definitiva - Sobrancelhas", duration: 90, price: 320 },
    ],
  },
  {
    category: "Depilação",
    icon: "🪒",
    services: [
      { name: "Depilação de Axilas", duration: 20, price: 30 },
      { name: "Depilação de Buço", duration: 15, price: 20 },
      { name: "Depilação de Perna Inteira", duration: 50, price: 70 },
      { name: "Depilação de Meia Perna", duration: 30, price: 50 },
      { name: "Depilação de Virilha Simples", duration: 20, price: 35 },
      { name: "Depilação de Virilha Cavada", duration: 25, price: 45 },
      { name: "Depilação de Virilha Completa", duration: 30, price: 55 },
      { name: "Depilação de Sobrancelha", duration: 15, price: 20 },
      { name: "Depilação de Rosto Feminino", duration: 30, price: 35 },
      { name: "Depilação de Braços", duration: 40, price: 60 },
      { name: "Depilação de Coxas", duration: 35, price: 55 },
      { name: "Depilação do Corpo Inteiro", duration: 120, price: 180 },
      { name: "Depilação Proctológica (Anal)", duration: 20, price: 40 },
    ],
  },
  {
    category: "Depilação Masculina",
    icon: "🧔‍♂️",
    services: [
      { name: "Depilação Masculina - Costas", duration: 50, price: 70 },
      { name: "Depilação Masculina - Tórax", duration: 45, price: 65 },
      { name: "Depilação Masculina - Tórax e Abdômen", duration: 60, price: 90 },
      { name: "Depilação Masculina - Nariz", duration: 10, price: 15 },
      { name: "Depilação Masculina - Orelhas", duration: 10, price: 15 },
      { name: "Depilação Masculina - Perna Inteira", duration: 60, price: 90 },
      { name: "Depilação Masculina - Axilas", duration: 20, price: 30 },
      { name: "Depilação Masculina - Barba Completa", duration: 30, price: 45 },
    ],
  },
  {
    category: "Estética Facial",
    icon: "✨",
    services: [
      { name: "Limpeza de Pele", duration: 60, price: 90 },
      { name: "Peeling", duration: 45, price: 80 },
      { name: "Peeling de Diamante", duration: 45, price: 100 },
      { name: "Massagem Facial", duration: 40, price: 60 },
      { name: "Hidratação Facial", duration: 45, price: 80 },
      { name: "Drenagem Linfática Facial", duration: 50, price: 90 },
      { name: "Botox / Toxina Botulínica", duration: 30, price: 500 },
      { name: "Preenchimento (Ácido Hialurônico)", duration: 45, price: 700 },
      { name: "Radiofrequência Facial", duration: 60, price: 150 },
    ],
  },
  {
    category: "Estética Corporal",
    icon: "🌿",
    services: [
      { name: "Massagem Relaxante", duration: 60, price: 110 },
      { name: "Massagem Modeladora", duration: 60, price: 110 },
      { name: "Massagem Redutora", duration: 60, price: 110 },
      { name: "Massagem Desportiva", duration: 60, price: 120 },
      { name: "Drenagem Linfática Manual", duration: 60, price: 110 },
      { name: "Drenagem Linfática com Aparelho", duration: 60, price: 130 },
      { name: "Esfoliação Corporal", duration: 45, price: 80 },
      { name: "Hidratação Corporal", duration: 45, price: 80 },
      { name: "Ultrassom", duration: 45, price: 100 },
      { name: "Radiofrequência Corporal", duration: 45, price: 130 },
      { name: "Lipocavitação", duration: 45, price: 120 },
      { name: "Carboxiterapia", duration: 30, price: 100 },
    ],
  },
  {
    category: "Tratamentos Capilares",
    icon: "💆",
    services: [
      { name: "Terapia Capilar Anti-Queda", duration: 60, price: 100 },
      { name: "Terapia Capilar contra Oleosidade", duration: 60, price: 100 },
      { name: "Plástica dos Fios", duration: 90, price: 180 },
      { name: "Nanoqueratinização Capilar", duration: 90, price: 200 },
      { name: "Photo Hair", duration: 60, price: 150 },
    ],
  },
  {
    category: "Massagem",
    icon: "🤲",
    services: [
      { name: "Massagem Relaxante Corporal", duration: 60, price: 110 },
      { name: "Massagem com Pedras Quentes", duration: 70, price: 140 },
      { name: "Bambuterapia", duration: 60, price: 130 },
      { name: "Reflexologia", duration: 50, price: 90 },
      { name: "Shiatsu", duration: 60, price: 120 },
      { name: "Quick Massage (20 min)", duration: 20, price: 40 },
    ],
  },
  {
    category: "Day Spa",
    icon: "🛁",
    services: [
      { name: "Day Spa Relaxante", duration: 120, price: 250 },
      { name: "Day Spa Desintoxicante", duration: 120, price: 280 },
      { name: "Day Spa da Beleza", duration: 120, price: 280 },
      { name: "Day Spa - Limpeza de Pele", duration: 60, price: 100 },
      { name: "Day Spa - Massagem Relaxante", duration: 60, price: 110 },
    ],
  },
  {
    category: "Banhos - Ofurô",
    icon: "🛀",
    services: [
      { name: "Banho Relaxante", duration: 60, price: 130 },
      { name: "Banho de Chocolate", duration: 60, price: 150 },
      { name: "Banho Cleópatra", duration: 60, price: 160 },
      { name: "Banho da Juventude", duration: 60, price: 150 },
      { name: "Banho de Chá Verde", duration: 60, price: 140 },
      { name: "Vinhoterapia", duration: 60, price: 160 },
      { name: "Talassoterapia", duration: 60, price: 150 },
      { name: "Fangoterapia", duration: 60, price: 140 },
    ],
  },
  {
    category: "Podologia",
    icon: "🦴",
    services: [
      { name: "Podologia Completa", duration: 60, price: 90 },
      { name: "Podologia - Unhas Encravadas", duration: 45, price: 70 },
      { name: "Podologia - Tratamento de Micose", duration: 45, price: 70 },
      { name: "Podologia - Curativo", duration: 30, price: 50 },
      { name: "Podologia - com Esmaltação Nacional", duration: 70, price: 100 },
    ],
  },
  {
    category: "Terapia Holística",
    icon: "🧘",
    services: [
      { name: "Aromaterapia", duration: 60, price: 100 },
      { name: "Cromoterapia", duration: 45, price: 80 },
      { name: "Acupuntura", duration: 50, price: 120 },
      { name: "Reflexologia", duration: 50, price: 90 },
      { name: "Massagem Ayurvédica", duration: 60, price: 130 },
      { name: "Tuiná", duration: 60, price: 110 },
    ],
  },
  {
    category: "Emagrecimento",
    icon: "⚖️",
    services: [
      { name: "Massagem Modeladora", duration: 60, price: 110 },
      { name: "Drenagem Linfática Manual", duration: 60, price: 110 },
      { name: "Endermologia", duration: 50, price: 130 },
      { name: "Manta Térmica (Infrared)", duration: 40, price: 80 },
    ],
  },
];

/** Retorna todas as categorias únicas */
export function getCatalogCategories(): string[] {
  return SERVICE_CATALOG.map(c => c.category);
}

/** Busca serviços do catálogo por termo */
export function searchCatalog(query: string): { category: string; icon: string; service: CatalogService }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: { category: string; icon: string; service: CatalogService }[] = [];
  for (const cat of SERVICE_CATALOG) {
    for (const svc of cat.services) {
      if (svc.name.toLowerCase().includes(q)) {
        results.push({ category: cat.category, icon: cat.icon, service: svc });
      }
    }
  }
  return results.slice(0, 20);
}
