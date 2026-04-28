import { useRef, useState } from "react";
import { FileText, Upload, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type SocioDocs = {
  identidadeFile: File | null;
  cpfFile: File | null;
};

export const emptyDocs = (): SocioDocs => ({
  identidadeFile: null,
  cpfFile: null,
});

type Props = {
  value: SocioDocs;
  onChange: (next: SocioDocs) => void;
  errors?: { identidadeFile?: string; cpfFile?: string };
};

const MAX_MB = 10;

function isPdf(f: File) {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

export function SocioDocuments({ value, onChange, errors }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <DocField
        label="Documento de identificação (RG ou CNH)"
        helper="Envie um arquivo em PDF do RG ou da CNH."
        file={value.identidadeFile}
        error={errors?.identidadeFile}
        onPick={(f) => onChange({ ...value, identidadeFile: f })}
      />
      <DocField
        label="Documento de CPF"
        helper="Envie um arquivo em PDF do CPF ou de um documento que contenha o CPF."
        file={value.cpfFile}
        error={errors?.cpfFile}
        onPick={(f) => onChange({ ...value, cpfFile: f })}
      />
    </div>
  );
}

function DocField({
  label,
  helper,
  file,
  error,
  onPick,
}: {
  label: string;
  helper: string;
  file: File | null;
  error?: string;
  onPick: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = (f: File | null) => {
    if (!f) {
      onPick(null);
      return;
    }
    if (!isPdf(f)) {
      toast.error("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_MB}MB.`);
      return;
    }
    onPick(f);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-5 text-center transition-colors ${
          drag
            ? "border-primary bg-primary/5"
            : file
              ? "border-primary/50 bg-primary/5"
              : error
                ? "border-destructive/60 bg-destructive/5"
                : "border-border hover:border-primary/40 hover:bg-muted/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              <span className="max-w-[180px] truncate">{file.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB · clique para trocar
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPick(null);
              }}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              <X className="mr-1 h-3 w-3" /> Remover
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Clique ou arraste o PDF aqui</span>
            <span className="text-xs text-muted-foreground">{helper}</span>
            <span className="text-xs text-muted-foreground">PDF · até {MAX_MB}MB</span>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}