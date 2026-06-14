import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Exibe uma imagem do bucket privado "obra-fotos" resolvendo o signed URL automaticamente.
 * `path` deve ser o caminho relativo no bucket (o valor salvo em foto_url).
 */
export function ObraFotoImg({
  path,
  alt,
  className,
  onClick,
}: {
  path: string;
  alt: string;
  className?: string;
  onClick?: (signedUrl: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from("obra-fotos")
      .createSignedUrl(path, 60 * 60) // válida por 1h
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div
        className={`animate-pulse rounded bg-muted ${className ?? "h-14 w-14"}`}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onClick={() => onClick?.(url)}
      style={onClick ? { cursor: "pointer" } : undefined}
    />
  );
}
