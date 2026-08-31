export type TourStep = {
  /** Casa com o atributo data-tour do elemento a destacar. */
  target: string;
  title: string;
  description: string;
};

/**
 * Passos do tour guiado de primeiro acesso ao /app.
 * `target` precisa bater com um data-tour existente no menu do franqueado.
 */
export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    target: "nav-unidade",
    title: "Minha Unidade",
    description:
      "Aqui ficam os dados da sua unidade e os documentos oficiais: COF, contrato e outros — sempre à mão.",
  },
  {
    target: "nav-financeiro",
    title: "Financeiro",
    description:
      "Registre receitas e despesas do mês e acompanhe o DRE da sua unidade em tempo real.",
  },
  {
    target: "nav-central",
    title: "Central de Suporte",
    description:
      "Acesso rápido aos sistemas do dia a dia (totem, café, Face ID) e aos canais de suporte da franqueadora.",
  },
  {
    target: "nav-obra",
    title: "Obra",
    description:
      "Acompanhe o checklist de itens da obra e os gastos, do início da montagem até a inauguração.",
  },
  {
    target: "nav-progresso",
    title: "Progresso",
    description:
      "Veja em que etapa da jornada de implementação sua unidade está, do zero até a abertura das portas.",
  },
];
