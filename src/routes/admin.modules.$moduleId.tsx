import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import {
  adminGetModule,
  adminAddLessonFromText,
  adminRegenerateLessonPart,
  adminGenerateLessonQcms,
  adminUpdateLesson,
  adminDeleteLesson,
  adminDeleteQuestion,
  adminAutoExtractAbbreviations,
  adminUpsertAbbreviation,
  adminDeleteAbbreviation,
} from "@/lib/lesson-admin.functions";
import { adminUpdateModule } from "@/lib/admin.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Sparkles, Trash2, Wand2, ChevronLeft, Save, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/modules/$moduleId")({ component: ModuleEditor });

function ModuleEditor() {
  const { moduleId } = useParams({ from: "/admin/modules/$moduleId" });
  const { me, loading } = useMe();
  const getFn = useServerFn(adminGetModule);
  const addLessonFn = useServerFn(adminAddLessonFromText);
  const regenFn = useServerFn(adminRegenerateLessonPart);
  const genQcmFn = useServerFn(adminGenerateLessonQcms);
  const updateLessonFn = useServerFn(adminUpdateLesson);
  const deleteLessonFn = useServerFn(adminDeleteLesson);
  const deleteQuestionFn = useServerFn(adminDeleteQuestion);
  const extractAbbrFn = useServerFn(adminAutoExtractAbbreviations);
  const upsertAbbrFn = useServerFn(adminUpsertAbbreviation);
  const deleteAbbrFn = useServerFn(adminDeleteAbbreviation);
  const updateModuleFn = useServerFn(adminUpdateModule);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [rawLesson, setRawLesson] = useState("");
  const [qcmCount, setQcmCount] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [draft, setDraft] = useState<any>({});
  const [newAbbr, setNewAbbr] = useState({ short: "", full_form: "" });
  const [moduleDraft, setModuleDraft] = useState({ name: "", emoji: "", description: "", learning_info: "" });

  const refresh = useCallback(async () => {
    const r = await getFn({ data: { id: moduleId } });
    setData(r);
    if (r.module) {
      setModuleDraft({
        name: r.module.name,
        emoji: r.module.emoji || "",
        description: r.module.description || "",
        learning_info: r.module.learning_info || "",
      });
    }
  }, [getFn, moduleId]);

  useEffect(() => { if (me?.isAdmin) refresh(); }, [me, refresh]);

  const run = async (key: string, fn: () => Promise<unknown>, ok = "Fait.") => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg(ok); await refresh(); }
    catch (e) { setMsg("Erreur: " + (e as Error).message); }
    finally { setBusy(null); }
  };

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!me.isAdmin) return <div className="p-6"><Link to="/admin" className="underline">← Admin</Link><p className="mt-2">Accès refusé.</p></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data.module) return <div className="p-6"><Link to="/admin" className="underline">← Admin</Link><p className="mt-2">Module introuvable.</p></div>;

  const lessons = data.lessons as any[];
  const abbreviations = data.abbreviations as any[];
  const questions = data.questions as any[];

  return (
    <div className="min-h-screen pb-20">
      <AppNav isAdmin />
      <main className="container mx-auto p-4 sm:p-6 space-y-5 max-w-5xl">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Admin
        </Link>

        {/* Module meta */}
        <Card>
          <CardHeader><CardTitle>📦 Module</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-[80px_1fr] gap-3">
              <div><Label>Emoji</Label><Input value={moduleDraft.emoji} onChange={(e) => setModuleDraft({...moduleDraft, emoji: e.target.value})} /></div>
              <div><Label>Nom</Label><Input value={moduleDraft.name} onChange={(e) => setModuleDraft({...moduleDraft, name: e.target.value})} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={moduleDraft.description} onChange={(e) => setModuleDraft({...moduleDraft, description: e.target.value})} /></div>
            <div><Label>Conseils d'apprentissage (affichés à l'étudiant)</Label><Textarea rows={3} value={moduleDraft.learning_info} onChange={(e) => setModuleDraft({...moduleDraft, learning_info: e.target.value})} /></div>
            <DuoButton variant="primary" size="sm" disabled={busy==="mod"} onClick={() => run("mod", () => updateModuleFn({ data: { id: moduleId, ...moduleDraft } }), "Module mis à jour")}>
              <Save className="h-4 w-4" /> Enregistrer le module
            </DuoButton>
          </CardContent>
        </Card>

        {/* Add lesson via AI */}
        <Card className="border-primary/40">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Ajouter une leçon — l'IA structure tout</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Colle le texte brut d'UNE leçon. L'IA en extrait titre, texte propre, résumé, pièges, mini-cas, abréviations et QCM.</p>
            <Textarea rows={8} placeholder="Colle ici la leçon brute (cours, notes…)" value={rawLesson} onChange={(e) => setRawLesson(e.target.value)} />
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-24"><Label>QCM</Label><Input type="number" min={0} max={15} value={qcmCount} onChange={(e) => setQcmCount(Number(e.target.value))} /></div>
              <DuoButton variant="primary" disabled={busy==="add" || rawLesson.length<30}
                onClick={() => run("add", async () => {
                  await addLessonFn({ data: { moduleId, rawText: rawLesson, generateQcm: qcmCount>0, qcmCount } });
                  setRawLesson("");
                }, "Leçon ajoutée par l'IA")}>
                {busy==="add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {busy==="add" ? "Génération..." : "Ajouter la leçon"}
              </DuoButton>
              {msg && <span className="text-sm">{msg}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>📚 Leçons ({lessons.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lessons.length === 0 && <p className="text-sm text-muted-foreground">Aucune leçon. Utilise le bloc ci-dessus.</p>}
            {lessons.map((l) => {
              const isEdit = editing === l.id;
              const lessonQs = questions.filter((q) => q.lesson_id === l.id && q.source === "admin");
              return (
                <div key={l.id} className="border-2 rounded-xl p-4 space-y-3">
                  {!isEdit ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold">{l.ord+1}. {l.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{l.summary || l.full_text?.slice(0, 200)}</p>
                        <div className="flex flex-wrap gap-1 mt-2 text-xs">
                          {l.summary && <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">résumé ✓</span>}
                          {l.traps && <span className="px-2 py-0.5 rounded bg-warning/15 text-warning-foreground font-bold">pièges ✓</span>}
                          {l.mini_case && <span className="px-2 py-0.5 rounded bg-sky/15 text-sky font-bold">cas ✓</span>}
                          <span className="px-2 py-0.5 rounded bg-heart/10 text-heart font-bold">{lessonQs.length} QCM</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(l.id); setDraft({ title: l.title, full_text: l.full_text, summary: l.summary, traps: l.traps, mini_case: l.mini_case }); }}>Éditer</Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer cette leçon ?")) run("d"+l.id, () => deleteLessonFn({ data: { id: l.id } }), "Leçon supprimée"); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input value={draft.title} onChange={(e) => setDraft({...draft, title: e.target.value})} placeholder="Titre" />
                      <Textarea rows={6} value={draft.full_text || ""} onChange={(e) => setDraft({...draft, full_text: e.target.value})} placeholder="Texte complet" />
                      <Textarea rows={4} value={draft.summary || ""} onChange={(e) => setDraft({...draft, summary: e.target.value})} placeholder="Résumé" />
                      <Textarea rows={3} value={draft.traps || ""} onChange={(e) => setDraft({...draft, traps: e.target.value})} placeholder="Pièges du prof" />
                      <Textarea rows={3} value={draft.mini_case || ""} onChange={(e) => setDraft({...draft, mini_case: e.target.value})} placeholder="Mini-cas clinique" />
                      <div className="flex gap-2">
                        <DuoButton size="sm" variant="primary" onClick={() => run("u"+l.id, () => updateLessonFn({ data: { id: l.id, ...draft } }).then(() => setEditing(null)), "Leçon mise à jour")}>Enregistrer</DuoButton>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" disabled={busy==="rs"+l.id} onClick={() => run("rs"+l.id, () => regenFn({ data: { lessonId: l.id, part: "summary" } }), "Résumé regénéré")}>
                      {busy==="rs"+l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Résumé IA
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy==="rt"+l.id} onClick={() => run("rt"+l.id, () => regenFn({ data: { lessonId: l.id, part: "traps" } }), "Pièges regénérés")}>
                      <Wand2 className="h-3 w-3" /> Pièges IA
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy==="rm"+l.id} onClick={() => run("rm"+l.id, () => regenFn({ data: { lessonId: l.id, part: "mini_case" } }), "Mini-cas regénéré")}>
                      <Wand2 className="h-3 w-3" /> Mini-cas IA
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy==="rq"+l.id} onClick={() => run("rq"+l.id, () => genQcmFn({ data: { lessonId: l.id, count: 5, replace: false } }), "QCM ajoutés")}>
                      <RefreshCw className="h-3 w-3" /> +5 QCM
                    </Button>
                  </div>
                  {lessonQs.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-bold">Voir les {lessonQs.length} QCM</summary>
                      <div className="space-y-2 mt-2">
                        {lessonQs.map((q) => (
                          <div key={q.id} className="rounded border p-2 text-xs">
                            <div className="flex justify-between gap-2">
                              <p className="font-semibold flex-1">{q.stem}</p>
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer ce QCM ?")) run("dq"+q.id, () => deleteQuestionFn({ data: { id: q.id } }), "QCM supprimé"); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {(q.choices ?? []).slice().sort((a:any,b:any)=>a.letter.localeCompare(b.letter)).map((c:any) => (
                                <li key={c.id} className={c.is_correct ? "text-success font-bold" : ""}>
                                  {c.is_correct ? "✓" : "·"} <b>{c.letter})</b> {c.text}
                                  {c.explanation && <span className="text-muted-foreground italic"> — {c.explanation}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Abbreviations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>🔤 Abréviations ({abbreviations.length})</CardTitle>
            <Button size="sm" variant="outline" disabled={busy==="abx"} onClick={() => run("abx", () => extractAbbrFn({ data: { moduleId } }), "Abréviations extraites")}>
              {busy==="abx" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Extraire avec l'IA
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[120px_1fr_auto] gap-2">
              <Input placeholder="AVC" value={newAbbr.short} onChange={(e) => setNewAbbr({...newAbbr, short: e.target.value})} />
              <Input placeholder="Accident vasculaire cérébral" value={newAbbr.full_form} onChange={(e) => setNewAbbr({...newAbbr, full_form: e.target.value})} />
              <Button size="sm" disabled={!newAbbr.short || !newAbbr.full_form} onClick={() => run("ab+", async () => { await upsertAbbrFn({ data: { moduleId, ...newAbbr } }); setNewAbbr({ short: "", full_form: "" }); }, "Ajoutée")}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-1 text-sm">
              {abbreviations.map((a) => (
                <div key={a.id} className="flex items-center justify-between border rounded px-2 py-1">
                  <span><b>{a.short}</b> — {a.full_form}</span>
                  <Button size="sm" variant="ghost" onClick={() => run("da"+a.id, () => deleteAbbrFn({ data: { id: a.id } }), "Supprimée")}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}