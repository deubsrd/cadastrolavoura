export interface DRELine {
  id: string;
  label: string;
  type: "header" | "subitem" | "total";
  indent: number;
  isEditable: boolean;
  sign: "+" | "-" | "=" | "";
  children?: string[];
  percentOfRevenue?: boolean;
  categoryId?: string; // which category this item belongs to (for custom items)
}

export interface DREData {
  [lineId: string]: number;
}

export interface CustomItem {
  id: string;
  label: string;
  categoryId: string;
}

export interface MonthRecord {
  id: string;
  month: number;
  year: number;
  label: string;
  data: DREData;
  customItems: CustomItem[];
  removedItems: string[];
  createdAt: string;
}

// Categories that support adding/removing items
export const EDITABLE_CATEGORIES: Record<
  string,
  { parentId: string; indent: number; defaultChildren: string[] }
> = {
  fat_bruto: {
    parentId: "fat_bruto",
    indent: 1,
    defaultChildren: ["fat_lavagem", "fat_secagens", "fat_outras"],
  },
  cmv_total: { parentId: "cmv_total", indent: 1, defaultChildren: ["cmv_sabao", "cmv_amaciante"] },
  impostos_total: { parentId: "impostos_total", indent: 1, defaultChildren: ["impostos_val"] },
  devolucoes_total: {
    parentId: "devolucoes_total",
    indent: 1,
    defaultChildren: ["devolucoes_ressarcimento"],
  },
  custos_total: {
    parentId: "custos_total",
    indent: 1,
    defaultChildren: ["custos_manutencao", "custos_insumos_cafe"],
  },
  comissoes_total: { parentId: "comissoes_total", indent: 1, defaultChildren: ["comissoes_taxas"] },
  desp_adm_sub: {
    parentId: "desp_adm_sub",
    indent: 2,
    defaultChildren: [
      "desp_aluguel",
      "desp_energia",
      "desp_prolabore",
      "desp_salarios",
      "desp_internet",
      "desp_face_id",
      "desp_totem",
      "desp_macpay",
      "desp_seguranca",
      "desp_contabil",
      "desp_limpeza",
    ],
  },
  mkt_total: {
    parentId: "mkt_total",
    indent: 2,
    defaultChildren: ["mkt_publicacoes", "mkt_google", "mkt_adesivagens"],
  },
  outras_desp_total: { parentId: "outras_desp_total", indent: 2, defaultChildren: ["royalties"] },
  reembolsos_total: {
    parentId: "reembolsos_total",
    indent: 1,
    defaultChildren: ["reembolsos_val"],
  },
  investimentos_total: { parentId: "investimentos_total", indent: 1, defaultChildren: [] },
};

// Base structure (without custom items)
export const BASE_DRE_STRUCTURE: DRELine[] = [
  {
    id: "fat_bruto",
    label: "(=) FATURAMENTO BRUTO TOTAL",
    type: "total",
    indent: 0,
    isEditable: false,
    sign: "=",
    children: ["fat_lavagem", "fat_secagens", "fat_outras"],
    percentOfRevenue: true,
  },
  {
    id: "fat_lavagem",
    label: "(+) Faturamento Bruto - Lavagem",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "+",
    categoryId: "fat_bruto",
  },
  {
    id: "fat_secagens",
    label: "(+) Faturamento Bruto - Secagens",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "+",
    categoryId: "fat_bruto",
  },
  {
    id: "fat_outras",
    label: "(+) Faturamento Bruto - Outras Receitas",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "+",
    categoryId: "fat_bruto",
  },

  {
    id: "cmv_total",
    label: "(-) CMV",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "-",
    children: ["cmv_sabao", "cmv_amaciante"],
    percentOfRevenue: true,
  },
  {
    id: "cmv_sabao",
    label: "Sabão",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "cmv_total",
  },
  {
    id: "cmv_amaciante",
    label: "Amaciante",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "cmv_total",
  },

  {
    id: "impostos_total",
    label: "(-) Impostos sobre Vendas",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "-",
    children: ["impostos_val"],
    percentOfRevenue: true,
  },
  {
    id: "impostos_val",
    label: "Impostos",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "impostos_total",
  },

  {
    id: "depreciacao",
    label: "(-) Depreciação",
    type: "header",
    indent: 0,
    isEditable: true,
    sign: "-",
    percentOfRevenue: true,
  },

  {
    id: "devolucoes_total",
    label: "(-) Devoluções/Cancelamentos",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "-",
    children: ["devolucoes_ressarcimento"],
    percentOfRevenue: true,
  },
  {
    id: "devolucoes_ressarcimento",
    label: "Ressarcimento de Clientes",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "devolucoes_total",
  },

  {
    id: "receita_liquida",
    label: "(=) RECEITA LÍQUIDA",
    type: "total",
    indent: 0,
    isEditable: false,
    sign: "=",
    percentOfRevenue: true,
  },

  {
    id: "custos_total",
    label: "(-) Custos",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "-",
    children: ["custos_manutencao", "custos_insumos_cafe"],
    percentOfRevenue: true,
  },
  {
    id: "custos_manutencao",
    label: "Manutenção operacional",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "custos_total",
  },
  {
    id: "custos_insumos_cafe",
    label: "Insumos p/ máquina de café",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "custos_total",
  },

  {
    id: "comissoes_total",
    label: "(-) Comissões e Taxas de Cartão",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "-",
    children: ["comissoes_taxas"],
    percentOfRevenue: true,
  },
  {
    id: "comissoes_taxas",
    label: "Taxas financeiras",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "comissoes_total",
  },

  {
    id: "margem_contribuicao",
    label: "(=) MARGEM DE CONTRIBUIÇÃO",
    type: "total",
    indent: 0,
    isEditable: false,
    sign: "=",
    percentOfRevenue: true,
  },

  {
    id: "desp_adm_total",
    label: "(-) Despesas Administrativas",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "-",
    percentOfRevenue: true,
  },
  {
    id: "desp_adm_sub",
    label: "(-) Despesas Administrativas",
    type: "header",
    indent: 1,
    isEditable: false,
    sign: "-",
    children: [
      "desp_aluguel",
      "desp_energia",
      "desp_prolabore",
      "desp_salarios",
      "desp_internet",
      "desp_face_id",
      "desp_totem",
      "desp_macpay",
      "desp_seguranca",
      "desp_contabil",
      "desp_limpeza",
    ],
    percentOfRevenue: true,
  },
  {
    id: "desp_aluguel",
    label: "Aluguel",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_energia",
    label: "Energia",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_prolabore",
    label: "Pró-Labore",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_salarios",
    label: "Salários",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_internet",
    label: "Internet",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_face_id",
    label: "Sistemas - Face ID",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_totem",
    label: "Sistemas - Totem",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_macpay",
    label: "Sistemas - MacPay",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_seguranca",
    label: "Sistemas - Segurança (câmeras/ronda)",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_contabil",
    label: "Assessoria contábil",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },
  {
    id: "desp_limpeza",
    label: "Material de limpeza",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "desp_adm_sub",
  },

  {
    id: "mkt_total",
    label: "(-) Marketing",
    type: "header",
    indent: 1,
    isEditable: false,
    sign: "-",
    children: ["mkt_publicacoes", "mkt_google", "mkt_adesivagens"],
    percentOfRevenue: true,
  },
  {
    id: "mkt_publicacoes",
    label: "Publicações",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "mkt_total",
  },
  {
    id: "mkt_google",
    label: "Google ADS",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "mkt_total",
  },
  {
    id: "mkt_adesivagens",
    label: "Adesivagens",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "mkt_total",
  },

  {
    id: "ebitda",
    label: "(=) EBITDA (Lucro Operacional)",
    type: "total",
    indent: 0,
    isEditable: false,
    sign: "=",
    percentOfRevenue: true,
  },

  {
    id: "outras_rec_desp",
    label: "(+) Outras Receitas e Despesas Não Operacionais",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "",
    percentOfRevenue: true,
  },
  {
    id: "outras_desp_total",
    label: "(-) Outras Despesas Não Operacionais",
    type: "header",
    indent: 1,
    isEditable: false,
    sign: "-",
    children: ["royalties"],
    percentOfRevenue: true,
  },
  {
    id: "royalties",
    label: "Royalties",
    type: "subitem",
    indent: 2,
    isEditable: true,
    sign: "",
    categoryId: "outras_desp_total",
  },

  {
    id: "reembolsos_total",
    label: "(+) Reembolsos Diversos",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "+",
    children: ["reembolsos_val"],
    percentOfRevenue: true,
  },
  {
    id: "reembolsos_val",
    label: "Reembolsos diversos",
    type: "subitem",
    indent: 1,
    isEditable: true,
    sign: "",
    categoryId: "reembolsos_total",
  },

  {
    id: "investimentos_total",
    label: "(-) Investimentos/Empréstimos",
    type: "header",
    indent: 0,
    isEditable: false,
    sign: "-",
    children: [],
    percentOfRevenue: true,
  },

  {
    id: "saldo_final",
    label: "(=) SALDO FINAL (Disponibilidade)",
    type: "total",
    indent: 0,
    isEditable: false,
    sign: "=",
    percentOfRevenue: true,
  },
];

// Build the full DRE structure including custom items
export function buildDREStructure(
  customItems: CustomItem[],
  removedItems: string[] = [],
): DRELine[] {
  const result: DRELine[] = [];
  const removedSet = new Set(removedItems);

  for (const line of BASE_DRE_STRUCTURE) {
    // Skip removed default subitems
    if (removedSet.has(line.id)) continue;

    result.push(line);

    // After the last default child of a category, insert custom items
    const categoryId = line.categoryId;
    if (categoryId) {
      const catDef = EDITABLE_CATEGORIES[categoryId];
      if (catDef) {
        const activeDefaults = catDef.defaultChildren.filter((id) => !removedSet.has(id));
        const isLastActive = activeDefaults[activeDefaults.length - 1] === line.id;
        if (isLastActive) {
          const customs = customItems.filter((ci) => ci.categoryId === categoryId);
          for (const ci of customs) {
            result.push({
              id: ci.id,
              label: ci.label,
              type: "subitem",
              indent: catDef.indent,
              isEditable: true,
              sign: "",
              categoryId,
            });
          }
        }
      }
    }

    // For categories with no remaining default children, insert customs after header
    if (EDITABLE_CATEGORIES[line.id]) {
      const catDef = EDITABLE_CATEGORIES[line.id];
      const activeDefaults = catDef.defaultChildren.filter((id) => !removedSet.has(id));
      if (activeDefaults.length === 0) {
        const customs = customItems.filter((ci) => ci.categoryId === line.id);
        for (const ci of customs) {
          result.push({
            id: ci.id,
            label: ci.label,
            type: "subitem",
            indent: catDef.indent,
            isEditable: true,
            sign: "",
            categoryId: line.id,
          });
        }
      }
    }
  }

  return result;
}

// Get all children IDs for a category (default + custom)
function getCategoryChildren(
  categoryId: string,
  customItems: CustomItem[],
  removedItems: string[] = [],
): string[] {
  const catDef = EDITABLE_CATEGORIES[categoryId];
  if (!catDef) return [];
  const removedSet = new Set(removedItems);
  const defaultIds = catDef.defaultChildren.filter((id) => !removedSet.has(id));
  const customIds = customItems.filter((ci) => ci.categoryId === categoryId).map((ci) => ci.id);
  return [...defaultIds, ...customIds];
}

export function calculateDRE(
  data: DREData,
  customItems: CustomItem[] = [],
  removedItems: string[] = [],
): DREData {
  const calc = { ...data };

  const sumIds = (ids: string[]) => ids.reduce((s, id) => s + (calc[id] || 0), 0);
  const children = (catId: string) => getCategoryChildren(catId, customItems, removedItems);

  calc.fat_bruto = sumIds(children("fat_bruto"));
  calc.cmv_total = sumIds(children("cmv_total"));
  calc.impostos_total = sumIds(children("impostos_total"));
  calc.devolucoes_total = sumIds(children("devolucoes_total"));
  calc.receita_liquida =
    calc.fat_bruto -
    calc.cmv_total -
    calc.impostos_total -
    (calc.depreciacao || 0) -
    calc.devolucoes_total;
  calc.custos_total = sumIds(children("custos_total"));
  calc.comissoes_total = sumIds(children("comissoes_total"));
  calc.margem_contribuicao = calc.receita_liquida - calc.custos_total - calc.comissoes_total;
  calc.desp_adm_sub = sumIds(children("desp_adm_sub"));
  calc.mkt_total = sumIds(children("mkt_total"));
  calc.desp_adm_total = calc.desp_adm_sub + calc.mkt_total;
  calc.ebitda = calc.margem_contribuicao - calc.desp_adm_total;
  calc.outras_desp_total = sumIds(children("outras_desp_total"));
  calc.outras_rec_desp = calc.outras_desp_total;
  calc.reembolsos_total = sumIds(children("reembolsos_total"));

  const investChildren = children("investimentos_total");
  if (investChildren.length > 0) {
    calc.investimentos_total = sumIds(investChildren);
  }

  calc.saldo_final =
    calc.ebitda - calc.outras_desp_total + calc.reembolsos_total - (calc.investimentos_total || 0);

  return calc;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function getMonthLabel(month: number, year: number): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${months[month - 1]} ${year}`;
}

export const DEFAULT_DATA: DREData = {
  fat_lavagem: 0,
  fat_secagens: 0,
  fat_outras: 0,
  cmv_sabao: 0,
  cmv_amaciante: 0,
  impostos_val: 0,
  depreciacao: 0,
  devolucoes_ressarcimento: 0,
  custos_manutencao: 0,
  custos_insumos_cafe: 0,
  comissoes_taxas: 0,
  desp_aluguel: 0,
  desp_energia: 0,
  desp_prolabore: 0,
  desp_salarios: 0,
  desp_internet: 0,
  desp_face_id: 0,
  desp_totem: 0,
  desp_macpay: 0,
  desp_seguranca: 0,
  desp_contabil: 0,
  desp_limpeza: 0,
  mkt_publicacoes: 0,
  mkt_google: 0,
  mkt_adesivagens: 0,
  royalties: 0,
  reembolsos_val: 0,
  investimentos_total: 0,
};
