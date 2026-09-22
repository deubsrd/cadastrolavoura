/**
 * AnuncioTemplate.tsx
 *
 * Componente do template "Anúncio / Expansão / Promo" da Lavoura.
 * Renderiza o post 1080x1350 (4:5) na tela e expõe uma função pra
 * rasterizar em PNG usando html-to-image (npm i html-to-image).
 *
 * Assunção: stack React (compatível com TanStack Router / Vite).
 * Se o motor atual não for React, a lógica de estilos abaixo ainda
 * serve como referência 1:1 — é só recriar a marcação no framework
 * que vocês usam, as regras (rotação, stroke, sombra, fade) são as
 * mesmas independente da tecnologia.
 *
 * Assets necessários (do pacote anterior): lavoura-logo-escura.svg
 * e lavoura-logo-branca.svg — importar como imagem estática.
 */

import { forwardRef } from "react";
import { toPng } from "html-to-image";

// ---- Tokens de marca ------------------------------------------------

export const LAVOURA_TOKENS = {
  dark: "#2a4235",
  light: "#fdfdfd",
  logoIcon: "#5cb5e6",
  accentOptions: ["#e17c4c", "#394f3e", "#5a7a61"] as const,
};

// ---- Props ------------------------------------------------------------

export interface AnuncioTemplateProps {
  /** Texto curto de contexto, ex. "Toda terça-feira" — vai na tarja verde */
  tarja: string;
  /** Palavra/número de impacto, ex. "R$13,90" — grande, laranja, com contorno */
  impacto: string;
  /** Linha de apoio abaixo do título, ex. "em todas as unidades..." */
  subtitulo: string;
  /** Texto do botão/CTA no rodapé, ex. "Venha aproveitar. Só na Lavoura." */
  cta: string;
  /** URL da logo a usar (escolher a variante certa antes de passar aqui —
   *  ver escolherLogo() abaixo) */
  logoSrc: string;
  /** URL de foto de fundo (opcional) — se ausente, fundo sólido claro */
  fotoSrc?: string;
  /** Cor de destaque (laranja por padrão); ver LAVOURA_TOKENS.accentOptions */
  accent?: string;
}

/** Decide qual variante de logo usar a partir do tipo de fundo do post. */
export function escolherLogo(
  fundo: "claro" | "escuro-ou-foto",
  logos: { escura: string; branca: string }
): string {
  return fundo === "claro" ? logos.escura : logos.branca;
}

// ---- Componente ---------------------------------------------------------

export const AnuncioTemplate = forwardRef<HTMLDivElement, AnuncioTemplateProps>(
  ({ tarja, impacto, subtitulo, cta, logoSrc, fotoSrc, accent = "#e17c4c" }, ref) => {
    const { dark, light } = LAVOURA_TOKENS;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          position: "relative",
          overflow: "hidden",
          background: light,
          fontFamily: "'Nunito', 'Trebuchet MS', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        {fotoSrc && (
          <img
            src={fotoSrc}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              maskImage:
                "linear-gradient(to top, #000 0%, #000 55%, rgba(0,0,0,0.55) 76%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(to top, #000 0%, #000 55%, rgba(0,0,0,0.55) 76%, rgba(0,0,0,0) 100%)",
            }}
          />
        )}

        <div
          style={{
            marginTop: 72,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: dark,
            zIndex: 1,
          }}
        >
          Autosserviço Lavoura
        </div>

        <div
          style={{
            position: "relative",
            marginTop: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textTransform: "uppercase",
            fontWeight: 900,
            zIndex: 1,
          }}
        >
          <div
            style={{
              background: dark,
              color: light,
              borderRadius: 34,
              boxSizing: "border-box",
              padding: "18px 56px",
              fontSize: 58,
              lineHeight: 1,
              letterSpacing: 1,
              transform: "rotate(-2deg)",
              position: "relative",
              zIndex: 1,
              whiteSpace: "nowrap",
            }}
          >
            {tarja}
          </div>
          <div
            style={{
              marginTop: -30,
              position: "relative",
              zIndex: 2,
              fontSize: 220,
              lineHeight: 1,
              letterSpacing: -2,
              color: accent,
              WebkitTextStroke: `18px ${light}`,
              paintOrder: "stroke fill",
              transform: "rotate(-3deg)",
              filter: "drop-shadow(0px 10px 18px rgba(26,36,32,0.28))",
              whiteSpace: "nowrap",
            }}
          >
            {impacto}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 34,
            fontWeight: 800,
            color: dark,
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.3,
            zIndex: 1,
          }}
        >
          {subtitulo}
        </div>

        <div
          style={{
            marginTop: "auto",
            marginBottom: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            zIndex: 1,
          }}
        >
          <img src={logoSrc} alt="Lavoura – Lavanderia de Autosserviço" style={{ width: 300, height: "auto" }} />
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: light,
              background: accent,
              padding: "16px 40px",
              borderRadius: 999,
            }}
          >
            {cta}
          </div>
        </div>
      </div>
    );
  }
);

AnuncioTemplate.displayName = "AnuncioTemplate";

// ---- Exportação para PNG --------------------------------------------------

/**
 * Rasteriza o nó do template em PNG. Chamar depois que o componente
 * já montou e as fontes carregaram (ex.: document.fonts.ready).
 *
 * Uso:
 *   const ref = useRef<HTMLDivElement>(null);
 *   await document.fonts.ready;
 *   const dataUrl = await exportarPng(ref.current!);
 */
export async function exportarPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    width: 1080,
    height: 1350,
    pixelRatio: 2, // exporta em 2160x2700 para nitidez em telas retina
    cacheBust: true,
  });
}
