import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, PauseCircle, Trophy, UserCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  sdb,
  displayName,
  within24h,
  type Contact,
  type Tag,
  type CustomField,
} from "@/lib/social/api";

export function ContactPanel({
  contactId,
  onChanged,
}: {
  contactId: string;
  onChanged?: () => void;
}) {
  const [c, setC] = useState<Contact | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data: contact }, { data: t }, { data: f }, { data: ct }] = await Promise.all([
      sdb.from("ss_contacts").select("*").eq("id", contactId).single(),
      sdb.from("ss_tags").select("*").order("name"),
      sdb.from("ss_custom_fields").select("*").order("label"),
      sdb.from("ss_contact_tags").select("tag_id").eq("contact_id", contactId),
    ]);
    setC(contact as Contact);
    setTags((t ?? []) as Tag[]);
    setFields((f ?? []) as CustomField[]);
    setMine(new Set((ct ?? []).map((x: { tag_id: string }) => x.tag_id)));
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [contactId]);

  if (!c) return null;

  const patch = async (p: Partial<Contact>) => {
    const { error } = await sdb.from("ss_contacts").update(p).eq("id", c.id);
    if (error) return toast.error(error.message);
    setC({ ...c, ...p });
    onChanged?.();
  };

  const toggleTag = async (id: string) => {
    if (mine.has(id))
      await sdb.from("ss_contact_tags").delete().eq("contact_id", c.id).eq("tag_id", id);
    else await sdb.from("ss_contact_tags").insert({ contact_id: c.id, tag_id: id });
    const n = new Set(mine);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setMine(n);
    onChanged?.();
  };

  const paused = (c as Contact & { automation_paused_until?: string | null })
    .automation_paused_until;
  const isPaused = !!paused && Date.parse(paused) > Date.now();

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={c.avatar_url ?? undefined} />
          <AvatarFallback>
            {displayName(c).replace("@", "").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-bold text-primary">{displayName(c)}</p>
          {c.username && (
            <a
              href={`https://instagram.com/${c.username}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              @{c.username} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted p-2">
          <Trophy className="mb-1 h-3.5 w-3.5 text-accent" />
          <b>{c.score}</b> pontos
        </div>
        <div className="rounded-lg bg-muted p-2">
          <UserCheck className="mb-1 h-3.5 w-3.5 text-accent" />
          {c.follows_business == null
            ? "Seguidor ?"
            : c.follows_business
              ? "Segue a Lavoura"
              : "Não segue"}
        </div>
      </div>
      <p
        className={`rounded-lg px-2.5 py-1.5 text-xs ${within24h(c.last_inbound_at) ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
      >
        {within24h(c.last_inbound_at)
          ? "Janela de 24h aberta: pode responder."
          : "Fora da janela de 24h: aguarde a pessoa escrever."}
      </p>

      <section className="space-y-2">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Dados</Label>
        <Input
          defaultValue={c.name ?? ""}
          placeholder="Nome"
          onBlur={(e) => e.target.value !== (c.name ?? "") && patch({ name: e.target.value })}
        />
        <Input
          defaultValue={c.whatsapp ?? ""}
          placeholder="WhatsApp"
          onBlur={(e) =>
            e.target.value !== (c.whatsapp ?? "") && patch({ whatsapp: e.target.value })
          }
        />
        <Input
          defaultValue={c.email ?? ""}
          placeholder="E-mail"
          onBlur={(e) => e.target.value !== (c.email ?? "") && patch({ email: e.target.value })}
        />
        {fields.map((f) => (
          <Input
            key={f.key}
            defaultValue={String(c.fields?.[f.key] ?? "")}
            placeholder={f.label}
            onBlur={(e) =>
              e.target.value !== String(c.fields?.[f.key] ?? "") &&
              patch({ fields: { ...c.fields, [f.key]: e.target.value } })
            }
          />
        ))}
      </section>

      <section className="space-y-2">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Etiquetas</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTag(t.id)}
              className="rounded-full border px-2.5 py-1 text-xs font-medium"
              style={
                mine.has(t.id)
                  ? { background: t.color, color: "#fdfdfd", borderColor: t.color }
                  : undefined
              }
            >
              {t.name}
            </button>
          ))}
          {!tags.length && (
            <p className="text-xs text-muted-foreground">Crie etiquetas em Configurações.</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() =>
            patch({
              automation_paused_until: isPaused
                ? null
                : new Date(Date.now() + 24 * 3600_000).toISOString(),
            } as Partial<Contact>)
          }
        >
          <PauseCircle className="mr-2 h-4 w-4" />{" "}
          {isPaused ? "Retomar automações" : "Pausar automações por 24h"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive"
          onClick={() => patch({ blocked: !c.blocked })}
        >
          <Ban className="mr-2 h-4 w-4" />{" "}
          {c.blocked ? "Desbloquear" : "Bloquear (nunca automatizar)"}
        </Button>
      </section>
    </div>
  );
}
