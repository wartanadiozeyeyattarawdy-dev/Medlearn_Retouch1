import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listYears = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("years")
      .select("*")
      .order("ord", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const searchModules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ q: z.string().max(200).default(""), yearId: z.string().uuid().nullable().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const args: { q: string; _year?: string } = { q: data.q };
    if (data.yearId) args._year = data.yearId;
    const { data: rows, error } = await context.supabase.rpc("search_modules", args);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: module }, { data: lessons }, { data: abbr }] = await Promise.all([
      supabase.from("modules").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("lessons").select("*").eq("module_id", data.id).order("ord"),
      supabase.from("abbreviations").select("*").eq("module_id", data.id),
    ]);
    return { module, lessons: lessons ?? [], abbreviations: abbr ?? [] };
  });

export const getLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) return { lesson: null, abbreviations: [] };
    const { data: abbr } = await supabase
      .from("abbreviations")
      .select("*")
      .eq("module_id", lesson.module_id);
    return { lesson, abbreviations: abbr ?? [] };
  });