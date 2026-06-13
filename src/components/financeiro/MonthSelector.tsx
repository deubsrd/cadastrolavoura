import { useState } from "react";
import { MonthRecord, getMonthLabel } from "@/lib/dre-structure";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  records: MonthRecord[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (month: number, year: number) => void;
  onDelete: (id: string) => void;
}

const MONTHS = [
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

export function MonthSelector({ records, activeId, onSelect, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));

  const handleAdd = () => {
    onAdd(Number(newMonth), Number(newYear));
    setOpen(false);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {records.map((r) => (
        <div key={r.id} className="group flex items-center gap-1">
          <button
            onClick={() => onSelect(r.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              r.id === activeId
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {r.label}
          </button>
          {records.length > 1 && (
            <button
              onClick={() => onDelete(r.id)}
              className="hidden rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Mês
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar novo mês</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Select value={newMonth} onValueChange={setNewMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newYear} onValueChange={setNewYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} className="mt-2 w-full">
            Adicionar {getMonthLabel(Number(newMonth), Number(newYear))}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
