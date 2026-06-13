import { useState, useEffect, useCallback } from "react";
import { MonthRecord, DEFAULT_DATA, DREData, CustomItem, getMonthLabel } from "@/lib/dre-structure";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export function useFinanceiro(unidadeId: string | null) {
  const [records, setRecords] = useState<MonthRecord[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    if (!unidadeId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("financeiro_mensal")
      .select("*")
      .eq("unidade_id", unidadeId)
      .order("year", { ascending: true })
      .order("month", { ascending: true });

    if (error) {
      console.error("Error loading financeiro records:", error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const mapped: MonthRecord[] = data.map((r) => ({
        id: r.id,
        month: r.month,
        year: r.year,
        label: r.label,
        data: (r.data as unknown as DREData) || {},
        customItems: (r.custom_items as unknown as CustomItem[]) || [],
        removedItems: (r.removed_items as unknown as string[]) || [],
        createdAt: r.created_at,
      }));
      setRecords(mapped);
      setActiveId((prev) =>
        prev && mapped.find((m) => m.id === prev) ? prev : mapped[mapped.length - 1].id,
      );
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const { data: newRec, error: insertError } = await supabase
        .from("financeiro_mensal")
        .insert({
          unidade_id: unidadeId,
          created_by: user?.id ?? null,
          month,
          year,
          label: getMonthLabel(month, year),
          data: DEFAULT_DATA as unknown as Json,
          custom_items: [] as unknown as Json,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating initial financeiro record:", insertError);
        setLoading(false);
        return;
      }

      if (newRec) {
        const rec: MonthRecord = {
          id: newRec.id,
          month: newRec.month,
          year: newRec.year,
          label: newRec.label,
          data: (newRec.data as unknown as DREData) || {},
          customItems: (newRec.custom_items as unknown as CustomItem[]) || [],
          removedItems: (newRec.removed_items as unknown as string[]) || [],
          createdAt: newRec.created_at,
        };
        setRecords([rec]);
        setActiveId(rec.id);
      }
    }
    setLoading(false);
  }, [unidadeId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const activeRecord = records.find((r) => r.id === activeId) || records[records.length - 1];

  const updateData = useCallback(
    async (lineId: string, value: number) => {
      setRecords((prev) =>
        prev.map((r) => (r.id === activeId ? { ...r, data: { ...r.data, [lineId]: value } } : r)),
      );

      const record = records.find((r) => r.id === activeId);
      if (!record) return;
      const newData = { ...record.data, [lineId]: value };

      await supabase
        .from("financeiro_mensal")
        .update({ data: newData as unknown as Json })
        .eq("id", activeId);
    },
    [activeId, records],
  );

  const addCustomItem = useCallback(
    async (categoryId: string, label: string) => {
      const record = records.find((r) => r.id === activeId);
      if (!record) return;

      const newItem: CustomItem = {
        id: `custom_${categoryId}_${Date.now()}`,
        label,
        categoryId,
      };
      const newCustomItems = [...record.customItems, newItem];
      const newData = { ...record.data, [newItem.id]: 0 };

      setRecords((prev) =>
        prev.map((r) =>
          r.id === activeId ? { ...r, customItems: newCustomItems, data: newData } : r,
        ),
      );

      await supabase
        .from("financeiro_mensal")
        .update({
          custom_items: newCustomItems as unknown as Json,
          data: newData as unknown as Json,
        })
        .eq("id", activeId);
    },
    [activeId, records],
  );

  const removeCustomItem = useCallback(
    async (itemId: string) => {
      const record = records.find((r) => r.id === activeId);
      if (!record) return;

      const newCustomItems = record.customItems.filter((ci) => ci.id !== itemId);
      const newData = { ...record.data };
      delete newData[itemId];

      setRecords((prev) =>
        prev.map((r) =>
          r.id === activeId ? { ...r, customItems: newCustomItems, data: newData } : r,
        ),
      );

      await supabase
        .from("financeiro_mensal")
        .update({
          custom_items: newCustomItems as unknown as Json,
          data: newData as unknown as Json,
        })
        .eq("id", activeId);
    },
    [activeId, records],
  );

  const renameCustomItem = useCallback(
    async (itemId: string, newLabel: string) => {
      const record = records.find((r) => r.id === activeId);
      if (!record) return;

      const newCustomItems = record.customItems.map((ci) =>
        ci.id === itemId ? { ...ci, label: newLabel } : ci,
      );

      setRecords((prev) =>
        prev.map((r) => (r.id === activeId ? { ...r, customItems: newCustomItems } : r)),
      );

      await supabase
        .from("financeiro_mensal")
        .update({ custom_items: newCustomItems as unknown as Json })
        .eq("id", activeId);
    },
    [activeId, records],
  );

  const addMonth = useCallback(
    async (month: number, year: number) => {
      if (!unidadeId) return;
      const exists = records.find((r) => r.month === month && r.year === year);
      if (exists) {
        setActiveId(exists.id);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const lastRecord = records[records.length - 1];

      const { data: newRec, error } = await supabase
        .from("financeiro_mensal")
        .insert({
          unidade_id: unidadeId,
          created_by: user?.id ?? null,
          month,
          year,
          label: getMonthLabel(month, year),
          data: (lastRecord ? { ...lastRecord.data } : { ...DEFAULT_DATA }) as unknown as Json,
          custom_items: (lastRecord ? [...lastRecord.customItems] : []) as unknown as Json,
          removed_items: (lastRecord ? [...lastRecord.removedItems] : []) as unknown as Json,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding month:", error);
        return;
      }

      if (newRec) {
        const rec: MonthRecord = {
          id: newRec.id,
          month: newRec.month,
          year: newRec.year,
          label: newRec.label,
          data: (newRec.data as unknown as DREData) || {},
          customItems: (newRec.custom_items as unknown as CustomItem[]) || [],
          removedItems: (newRec.removed_items as unknown as string[]) || [],
          createdAt: newRec.created_at,
        };
        setRecords((prev) => [...prev, rec].sort((a, b) => a.year - b.year || a.month - b.month));
        setActiveId(rec.id);
      }
    },
    [records, unidadeId],
  );

  const deleteMonth = useCallback(
    async (id: string) => {
      if (records.length <= 1) return;

      await supabase.from("financeiro_mensal").delete().eq("id", id);

      setRecords((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (activeId === id) setActiveId(next[next.length - 1].id);
        return next;
      });
    },
    [records, activeId],
  );

  const removeDefaultItem = useCallback(
    async (itemId: string) => {
      const record = records.find((r) => r.id === activeId);
      if (!record) return;

      const newRemovedItems = [...record.removedItems, itemId];

      setRecords((prev) =>
        prev.map((r) => (r.id === activeId ? { ...r, removedItems: newRemovedItems } : r)),
      );

      await supabase
        .from("financeiro_mensal")
        .update({ removed_items: newRemovedItems as unknown as Json })
        .eq("id", activeId);
    },
    [activeId, records],
  );

  return {
    records,
    activeRecord,
    activeId,
    setActiveId,
    updateData,
    addMonth,
    deleteMonth,
    addCustomItem,
    removeCustomItem,
    removeDefaultItem,
    renameCustomItem,
    loading,
  };
}
