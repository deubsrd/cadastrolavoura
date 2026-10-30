import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Settings, Loader2, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { sdb, displayName, type Contact, type Tag } from "@/lib/social/api";
import { ContactPanel } from "@/components/social/ContactPanel";

export const Route = createFileRoute("/admin/social/ranking")({
  component: Ranking,
});

function Ranking() {
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tag, setTag] = useState("all");
  const [follows, setFollows] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    let q = sdb
      .from("ss_contacts")
      .select("*, ss_contact_tags!left(tag_id)")
      .eq("blocked", false)
      .gt("score", 0)
      .order("score", { ascending: false })
      .limit(200);
    if (follows !== "all") q = q.eq("follows_business", follows === "yes");
    const [{ data }, { data: t }] = await Promise.all([
      q,
      sdb.from("ss_tags").select("*").order("name"),
    ]);
    let list = (data ?? []) as Contact[];
    if (tag !== "all")
      list = list.filter((c) => (c.ss_contact_tags ?? []).some((x) => x.tag_id === tag));
    setRows(list);
    setTags((t ?? []) as Tag[]);
  };
  useEffect(() => {
    setRows(null);
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tag, follows]);

  const medal = (i: number) =>
    i === 0 ? "#e17c4c" : i === 1 ? "#394f3e" : i === 2 ? "#8a948c" : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Ranking</h1>
          <p className="text-sm text-muted-foreground">
            Quem mais interage com a Lavoura. Ótimo para sorteios, convites e priorizar o
            atendimento.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/social/config" search={{ tab: "ranking" }}>
            <Settings className="mr-1 h-4 w-4" /> Configurar pontuação
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etiquetas</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={follows} onValueChange={setFollows}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Segue ou não</SelectItem>
            <SelectItem value="yes">Segue</SelectItem>
            <SelectItem value="no">Não segue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rows === null ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card py-14 text-center text-sm text-muted-foreground">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-accent" />
          Ninguém pontuou ainda.
        </div>
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {rows.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => setOpen(c.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <span className="w-8 text-center text-sm font-bold text-muted-foreground">
                  {medal(i) ? (
                    <Medal className="mx-auto h-5 w-5" style={{ color: medal(i)! }} />
                  ) : (
                    i + 1
                  )}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={c.avatar_url ?? undefined} />
                  <AvatarFallback>{(c.username ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-medium">{displayName(c)}</span>
                <span className="font-extrabold text-primary">{c.score} pts</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto p-0">
          {open && <ContactPanel contactId={open} onChanged={load} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
