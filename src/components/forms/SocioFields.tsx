import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskCEP, maskCPF, maskPhone, maskRG, UF_LIST } from "@/lib/masks";

export type SocioData = {
  tipo: "administrador" | "cotista";
  nome_completo: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  rg: string;
  rg_orgao: string;
  cpf: string;
  logradouro: string;
  numero_casa: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  nacionalidade: string;
  estado_civil: string;
};

export const emptySocio = (): SocioData => ({
  tipo: "cotista",
  nome_completo: "",
  email: "",
  telefone: "",
  data_nascimento: "",
  rg: "",
  rg_orgao: "",
  cpf: "",
  logradouro: "",
  numero_casa: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  nacionalidade: "Brasileira",
  estado_civil: "",
});

type Props = {
  value: SocioData;
  onChange: (next: SocioData) => void;
  errors?: Partial<Record<keyof SocioData, string>>;
};

export function SocioFields({ value, onChange, errors }: Props) {
  const set = <K extends keyof SocioData>(k: K, v: SocioData[K]) =>
    onChange({ ...value, [k]: v });

  const field = (id: string, label: string, node: React.ReactNode, err?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      {node}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {field("tipo", "Tipo de sócio",
        <Select value={value.tipo} onValueChange={(v) => set("tipo", v as SocioData["tipo"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="administrador">Sócio administrador</SelectItem>
            <SelectItem value="cotista">Sócio cotista</SelectItem>
          </SelectContent>
        </Select>
      )}

      {field("nome_completo", "Nome completo",
        <Input id="nome_completo" value={value.nome_completo}
          onChange={(e) => set("nome_completo", e.target.value)} />,
        errors?.nome_completo)}

      {field("email", "Email",
        <Input id="email" type="email" value={value.email}
          onChange={(e) => set("email", e.target.value)} />,
        errors?.email)}

      {field("telefone", "Telefone",
        <Input id="telefone" inputMode="tel" placeholder="(11) 91234-5678"
          value={value.telefone}
          onChange={(e) => set("telefone", maskPhone(e.target.value))} />,
        errors?.telefone)}

      {field("data_nascimento", "Data de nascimento",
        <Input id="data_nascimento" type="date" value={value.data_nascimento}
          onChange={(e) => set("data_nascimento", e.target.value)} />,
        errors?.data_nascimento)}

      {field("cpf", "CPF",
        <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00"
          value={value.cpf}
          onChange={(e) => set("cpf", maskCPF(e.target.value))} />,
        errors?.cpf)}

      {field("rg", "RG",
        <Input id="rg" value={value.rg}
          onChange={(e) => set("rg", maskRG(e.target.value))} />,
        errors?.rg)}

      {field("rg_orgao", "Órgão expedidor",
        <Input id="rg_orgao" placeholder="SSP/SP" value={value.rg_orgao}
          onChange={(e) => set("rg_orgao", e.target.value.toUpperCase())} />,
        errors?.rg_orgao)}

      {field("nacionalidade", "Nacionalidade",
        <Input id="nacionalidade" value={value.nacionalidade}
          onChange={(e) => set("nacionalidade", e.target.value)} />,
        errors?.nacionalidade)}

      {field("estado_civil", "Estado civil",
        <Select value={value.estado_civil} onValueChange={(v) => set("estado_civil", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
            <SelectItem value="Casado(a)">Casado(a)</SelectItem>
            <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
            <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
            <SelectItem value="União estável">União estável</SelectItem>
          </SelectContent>
        </Select>,
        errors?.estado_civil)}

      {field("cep", "CEP",
        <Input id="cep" inputMode="numeric" placeholder="00000-000"
          value={value.cep}
          onChange={(e) => set("cep", maskCEP(e.target.value))} />,
        errors?.cep)}

      <div className="sm:col-span-2">
        {field("logradouro", "Logradouro",
          <Input id="logradouro" value={value.logradouro}
            onChange={(e) => set("logradouro", e.target.value)} />,
          errors?.logradouro)}
      </div>

      {field("numero_casa", "Número",
        <Input id="numero_casa" value={value.numero_casa}
          onChange={(e) => set("numero_casa", e.target.value)} />,
        errors?.numero_casa)}

      {field("bairro", "Bairro",
        <Input id="bairro" value={value.bairro}
          onChange={(e) => set("bairro", e.target.value)} />,
        errors?.bairro)}

      {field("cidade", "Cidade",
        <Input id="cidade" value={value.cidade}
          onChange={(e) => set("cidade", e.target.value)} />,
        errors?.cidade)}

      {field("uf", "UF",
        <Select value={value.uf} onValueChange={(v) => set("uf", v)}>
          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>,
        errors?.uf)}
    </div>
  );
}