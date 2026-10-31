// Biblioteca de templates da Lavoura (substitui a "Comunidade" do original).
import { emptyTrigger, type FlowGraph, type TriggerData } from "./api";

export type BuiltinTemplate = {
  slug: string;
  name: string;
  description: string;
  goal: string;
  graph: () => FlowGraph;
};

const trig = (p: Partial<TriggerData>) => ({
  id: "trigger",
  type: "trigger",
  position: { x: 0, y: 120 },
  data: { ...emptyTrigger(), ...p },
});

const SITE = "https://www.lavanderialavoura.com.br";

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    slug: "link-acompanhe",
    name: "Envie link e acompanhe",
    goal: "Comentou a palavra → recebe o link na DM depois de clicar",
    description:
      "Responde o comentário em público, manda uma DM com botão e só entrega o link depois do clique (abre a janela de conversa).",
    graph: () => ({
      nodes: [
        trig({
          types: ["comment"],
          keywordMode: "contains",
          keywords: ["link"],
          publicReplies: [
            "Te mandei no direct! 💬",
            "Olha sua DM, {{primeiro_nome}}!",
            "Enviado no direct ✨",
          ],
        }),
        {
          id: "m1",
          type: "message",
          position: { x: 360, y: 100 },
          data: {
            items: [
              {
                kind: "text",
                text: "Oi, {{primeiro_nome}}! Que bom que você comentou 💚 Toca no botão que eu te mando o link.",
                buttons: [{ id: "b1", label: "Quero o link", type: "next" }],
              },
            ],
          },
        },
        {
          id: "m2",
          type: "message",
          position: { x: 720, y: 100 },
          data: {
            items: [
              {
                kind: "text",
                text: "Aqui está:",
                buttons: [{ id: "b2", label: "Abrir", type: "url", url: SITE }],
              },
            ],
          },
        },
      ],
      edges: [
        { id: "e1", source: "trigger", sourceHandle: "next", target: "m1" },
        { id: "e2", source: "m1", sourceHandle: "btn:b1", target: "m2" },
      ],
    }),
  },
  {
    slug: "link-direto",
    name: "Link direto via DM",
    goal: "Comentou → link na hora, sem clique",
    description:
      "Resposta pública + DM imediata com botão de link. Mais rápido, porém sem conversa aberta depois.",
    graph: () => ({
      nodes: [
        trig({
          types: ["comment"],
          keywordMode: "contains",
          keywords: ["eu quero"],
          publicReplies: ["Corre no direct! 📩"],
        }),
        {
          id: "m1",
          type: "message",
          position: { x: 360, y: 100 },
          data: {
            items: [
              {
                kind: "text",
                text: "Oi, {{primeiro_nome}}! Aqui está o link que você pediu:",
                buttons: [{ id: "b1", label: "Abrir", type: "url", url: SITE }],
              },
            ],
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger", sourceHandle: "next", target: "m1" }],
    }),
  },
  {
    slug: "coleta-whatsapp",
    name: "Colete WhatsApp",
    goal: "Monte sua base pedindo o WhatsApp automaticamente",
    description:
      "Pede o WhatsApp com validação, etiqueta o contato e (opcional) manda para o seu CRM pelo bloco HTTP.",
    graph: () => ({
      nodes: [
        trig({
          types: ["comment", "dm"],
          keywordMode: "contains",
          keywords: ["whatsapp", "zap"],
          publicReplies: ["Te chamei no direct!"],
        }),
        {
          id: "m1",
          type: "message",
          position: { x: 360, y: 100 },
          data: {
            items: [
              {
                kind: "text",
                text: "Oi, {{primeiro_nome}}! Posso te chamar no WhatsApp?",
                buttons: [{ id: "b1", label: "Pode sim", type: "next" }],
              },
            ],
          },
        },
        {
          id: "m2",
          type: "message",
          position: { x: 720, y: 100 },
          data: {
            items: [
              {
                kind: "question",
                text: "Me manda seu número com DDD 📲",
                field: "whatsapp",
                validate: "phone",
              },
              { kind: "text", text: "Prontinho! Em breve alguém do time te chama 💚" },
            ],
          },
        },
        { id: "t1", type: "tags", position: { x: 1080, y: 100 }, data: { add: [], remove: [] } },
      ],
      edges: [
        { id: "e1", source: "trigger", sourceHandle: "next", target: "m1" },
        { id: "e2", source: "m1", sourceHandle: "btn:b1", target: "m2" },
        { id: "e3", source: "m2", sourceHandle: "next", target: "t1" },
      ],
    }),
  },
  {
    slug: "grupo-whatsapp",
    name: "Convide para seu grupo no WhatsApp",
    goal: "Envia o link do grupo automaticamente",
    description: "Quem comenta ou chama no direct recebe o convite do grupo.",
    graph: () => ({
      nodes: [
        trig({
          types: ["comment", "dm", "story_reply"],
          keywordMode: "contains",
          keywords: ["grupo"],
          publicReplies: ["Convite enviado no direct! 🎉"],
        }),
        {
          id: "m1",
          type: "message",
          position: { x: 360, y: 100 },
          data: {
            items: [
              {
                kind: "text",
                text: "Aqui está o convite do nosso grupo, {{primeiro_nome}} 👇",
                buttons: [
                  {
                    id: "b1",
                    label: "Entrar no grupo",
                    type: "url",
                    url: "https://chat.whatsapp.com/",
                  },
                ],
              },
            ],
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger", sourceHandle: "next", target: "m1" }],
    }),
  },
  {
    slug: "produto",
    name: "Compartilhe seu produto",
    goal: "Envia o link do produto em qualquer interação",
    description: "Comentário, story ou DM com a palavra-chave recebem cartões com foto e botão.",
    graph: () => ({
      nodes: [
        trig({
          types: ["comment", "story_reply", "dm"],
          keywordMode: "contains",
          keywords: ["preço", "valor", "quanto"],
          publicReplies: ["Te mandei os detalhes no direct 💚"],
        }),
        {
          id: "m1",
          type: "message",
          position: { x: 360, y: 100 },
          data: {
            items: [
              {
                kind: "cards",
                cards: [
                  {
                    title: "Lavoura — lavanderia autosserviço",
                    subtitle: "Lave e seque com conforto, café e coworking",
                    imageUrl: "",
                    buttons: [{ id: "b1", label: "Ver unidades", type: "url", url: SITE }],
                  },
                ],
              },
            ],
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger", sourceHandle: "next", target: "m1" }],
    }),
  },
  {
    slug: "franqueado",
    name: "Quero ser franqueado",
    goal: "Qualifica interessados na franquia e manda para o comercial",
    description:
      "Pergunta nome, cidade e WhatsApp, etiqueta como lead de franquia e dispara para o CRM via HTTP.",
    graph: () => ({
      nodes: [
        trig({
          types: ["comment", "dm", "story_reply"],
          keywordMode: "contains",
          keywords: ["franquia", "franqueado", "investir"],
          publicReplies: ["Que demais! Te chamei no direct 💚", "Te mandei tudo no direct!"],
        }),
        {
          id: "m1",
          type: "message",
          position: { x: 360, y: 100 },
          data: {
            items: [
              {
                kind: "text",
                text: "Oi, {{primeiro_nome}}! Que bom que você quer conhecer a franquia Lavoura 💚 Posso te fazer 3 perguntas rápidas?",
                buttons: [{ id: "b1", label: "Bora!", type: "next" }],
              },
            ],
          },
        },
        {
          id: "m2",
          type: "message",
          position: { x: 720, y: 100 },
          data: {
            items: [
              {
                kind: "question",
                text: "Qual seu nome completo?",
                field: "nome",
                validate: "text",
              },
              {
                kind: "question",
                text: "Em qual cidade você pensa em abrir?",
                field: "cidade",
                validate: "text",
              },
              {
                kind: "question",
                text: "E seu WhatsApp com DDD?",
                field: "whatsapp",
                validate: "phone",
              },
              {
                kind: "text",
                text: "Perfeito, {{primeiro_nome}}! Nosso time de expansão vai te chamar no WhatsApp. Enquanto isso, conheça mais:",
                buttons: [{ id: "b2", label: "Site da franquia", type: "url", url: SITE }],
              },
            ],
          },
        },
        { id: "t1", type: "tags", position: { x: 1080, y: 100 }, data: { add: [], remove: [] } },
        {
          id: "h1",
          type: "http",
          position: { x: 1440, y: 100 },
          data: {
            method: "POST",
            url: "",
            headers: [],
            body: '{"nome":"{{nome}}","cidade":"{{campo.cidade}}","whatsapp":"{{whatsapp}}","instagram":"{{username}}"}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "trigger", sourceHandle: "next", target: "m1" },
        { id: "e2", source: "m1", sourceHandle: "btn:b1", target: "m2" },
        { id: "e3", source: "m2", sourceHandle: "next", target: "t1" },
        { id: "e4", source: "t1", sourceHandle: "next", target: "h1" },
      ],
    }),
  },
  {
    slug: "mencao-story",
    name: "Agradeça menções no story",
    goal: "Quem marca a Lavoura no story recebe um obrigado",
    description: "Mensagem automática de agradecimento para menções nos stories.",
    graph: () => ({
      nodes: [
        trig({ types: ["story_mention"] }),
        {
          id: "m1",
          type: "message",
          position: { x: 360, y: 100 },
          data: {
            items: [
              {
                kind: "text",
                text: "Ahhh, obrigado pela marcação, {{primeiro_nome}}! 💚 Volte sempre na Lavoura.",
              },
            ],
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger", sourceHandle: "next", target: "m1" }],
    }),
  },
];
