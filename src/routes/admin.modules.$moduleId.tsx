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
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminRepairModuleContent,
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
import { Loader2, Plus, Sparkles, Trash2, Wand2, ChevronLeft, Save, RefreshCw, Image, Video, StickyNote, Eye, Volume2, LinkIcon } from "lucide-react";

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
  const createQuestionFn = useServerFn(adminCreateQuestion);
  const updateQuestionFn = useServerFn(adminUpdateQuestion);
  const deleteQuestionFn = useServerFn(adminDeleteQuestion);
  const repairFn = useServerFn(adminRepairModuleContent);
  const extractAbbrFn = useServerFn(adminAutoExtractAbbreviations);
  const upsertAbbrFn = useServerFn(adminUpsertAbbreviation);
  const deleteAbbrFn = useServerFn(adminDeleteAbbreviation);
  const updateModuleFn = useServerFn(adminUpdateModule);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [rawLesson, setRawLesson] = useState("");
  const [qcmCount, setQcmCount] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [draft, setDraft] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [questionDraft, setQuestionDraft] = useState<any>({});
  const [newAbbr, setNewAbbr] = useState({ short: "", full_form: "" });
  const [moduleDraft, setModuleDraft] = useState({ name: "", emoji: "", description: "", learning_info: "", year_id: "", published: true });

  const refresh = useCallback(async () => {
    const r = await getFn({ data: { id: moduleId } });
    setData(r);
    if (r.module) {
      setModuleDraft({
        name: r.module.name,
        emoji: r.module.emoji || "",
        description: r.module.description || "",
        learning_info: r.module.learning_info || "",
        year_id: r.module.year_id || "",
        published: r.module.published ?? true,
      });
    }
  }, [getFn, moduleId]);

  useEffect(() => { if (me?.isAdmin) refresh(); }, [me, refresh]);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (busy) {
      setTimer(0);
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [busy]);

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
  const years = data.years as any[];
  const progressEstimate = busy === "add" ? Math.min(96, 8 + timer * 2) : busy ? Math.min(92, 18 + timer * 4) : 0;

  const startQuestionEdit = (q: any) => {
    setEditingQuestion(q.id);
    const choices = (q.choices ?? []).slice().sort((a: any, b: any) => a.letter.localeCompare(b.letter));
    setQuestionDraft({
      stem: q.stem || "",
      ord: q.ord ?? 0,
      teacher_note: q.teacher_note || "",
      image_url: q.image_url || "",
      video_url: q.video_url || "",
        audio_url: q.audio_url || "",
      choices: choices.length ? choices : ["a", "b", "c", "d"].map((letter) => ({ letter, text: "", is_correct: false, explanation: "" })),
    });
  };

  const updateChoice = (index: number, patch: Record<string, unknown>) => {
    const choices = [...(questionDraft.choices ?? [])];
    choices[index] = { ...choices[index], ...patch };
    setQuestionDraft({ ...questionDraft, choices });
  };

  return (
    <div className="min-h-screen pb-20">
      <AppNav isAdmin />
      <main className="container mx-auto p-4 sm:p-6 space-y-5 max-w-5xl">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Admin
        </Link>

        {/* Module meta */}
        <section className="duo-card p-5 bg-primary/5 border-primary/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold">Studio admin</h1>
              <p className="text-sm text-muted-foreground">{data.module.emoji} {data.module.name} · {lessons.length} leçons · {questions.length} QCM</p>
            </div>
            <Link to="/modules/$moduleId" params={{ moduleId }}>
              <DuoButton variant="ghost" size="sm"><Eye className="h-4 w-4" /> Aperçu étudiant</DuoButton>
            </Link>
            <DuoButton variant="primary" size="sm" disabled={busy==="repair"} onClick={() => run("repair", async () => {
              const r = await repairFn({ data: { moduleId, qcmPerLesson: 4 } });
              setMsg(`${r.summariesUpdated} résumé(s) repris · ${r.qcmAdded} QCM ajoutés`);
            }, "Module complété") }>
              {busy==="repair" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Compléter IA
            </DuoButton>
          </div>
          {busy && (
            <div className="mt-4 rounded-xl border-2 border-primary/30 bg-card p-4 animate-slide-up">
              <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Travail en cours</span>
                <span>{timer}s · env. {busy === "add" ? "45-90s" : "10-35s"}</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progressEstimate}%` }} />
              </div>
            </div>
          )}
          {msg && <p className="mt-3 text-sm font-bold">{msg}</p>}
        </section>

        <Card>
          <CardHeader><CardTitle>📦 Paramètres du module</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-[80px_1fr] gap-3">
              <div><Label>Emoji</Label><Input value={moduleDraft.emoji} onChange={(e) => setModuleDraft({...moduleDraft, emoji: e.target.value})} /></div>
              <div><Label>Nom</Label><Input value={moduleDraft.name} onChange={(e) => setModuleDraft({...moduleDraft, name: e.target.value})} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Année</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3" value={moduleDraft.year_id} onChange={(e) => setModuleDraft({...moduleDraft, year_id: e.target.value})}>
                  <option value="">Toutes / non classé</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Publication</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3" value={moduleDraft.published ? "yes" : "no"} onChange={(e) => setModuleDraft({...moduleDraft, published: e.target.value === "yes"})}>
                  <option value="yes">Publié aux étudiants</option>
                  <option value="no">Brouillon admin</option>
                </select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={moduleDraft.description} onChange={(e) => setModuleDraft({...moduleDraft, description: e.target.value})} /></div>
            <div><Label>Conseils d'apprentissage (affichés à l'étudiant)</Label><Textarea rows={3} value={moduleDraft.learning_info} onChange={(e) => setModuleDraft({...moduleDraft, learning_info: e.target.value})} /></div>
            <DuoButton variant="primary" size="sm" disabled={busy==="mod"} onClick={() => run("mod", () => updateModuleFn({ data: { id: moduleId, ...moduleDraft, year_id: moduleDraft.year_id || null } }), "Module mis à jour")}>
              <Save className="h-4 w-4" /> Enregistrer le module
            </DuoButton>
          </CardContent>
        </Card>

        {/* Add lesson via AI */}
        <Card className="border-primary/40">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Ajouter une leçon — l'IA structure tout</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Colle une leçon brute. Si le texte est long, l'IA le réduit avant de produire le résumé et les QCM pour éviter les coupures.</p>
            <Textarea rows={8} placeholder="Colle ici la leçon brute (cours, notes…)" value={rawLesson} onChange={(e) => setRawLesson(e.target.value)} />
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-24"><Label>QCM</Label><Input type="number" min={0} max={15} value={qcmCount} onChange={(e) => setQcmCount(Number(e.target.value))} /></div>
              <DuoButton variant="primary" disabled={busy==="add" || rawLesson.length<30}
                onClick={() => run("add", async () => {
                  await addLessonFn({ data: { moduleId, rawText: rawLesson, generateQcm: qcmCount>0, qcmCount } });
                  setRawLesson("");
                }, "Leçon ajoutée par l'IA")}>
                {busy==="add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {busy==="add" ? `Génération IA (${timer}s)...` : "Ajouter la leçon"}
              </DuoButton>
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
                          {l.image_url && <span className="px-2 py-0.5 rounded bg-sky/15 text-sky font-bold inline-flex items-center gap-1"><Image className="h-3 w-3" /> image</span>}
                          {l.video_url && <span className="px-2 py-0.5 rounded bg-xp/15 text-xp font-bold inline-flex items-center gap-1"><Video className="h-3 w-3" /> vidéo</span>}
                          {l.audio_url && <span className="px-2 py-0.5 rounded bg-heart/10 text-heart font-bold inline-flex items-center gap-1"><Volume2 className="h-3 w-3" /> audio</span>}
                          {l.resource_url && <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold inline-flex items-center gap-1"><LinkIcon className="h-3 w-3" /> ressource</span>}
                          <span className="px-2 py-0.5 rounded bg-heart/10 text-heart font-bold">{lessonQs.length} QCM</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(l.id); setDraft({ title: l.title, full_text: l.full_text, summary: l.summary, traps: l.traps, mini_case: l.mini_case, image_url: l.image_url || "", video_url: l.video_url || "", audio_url: l.audio_url || "", resource_url: l.resource_url || "", ord: l.ord }); }}>Éditer</Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer cette leçon ?")) run("d"+l.id, () => deleteLessonFn({ data: { id: l.id } }), "Leçon supprimée"); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid sm:grid-cols-[1fr_90px] gap-2">
                        <Input value={draft.title} onChange={(e) => setDraft({...draft, title: e.target.value})} placeholder="Titre" />
                        <Input type="number" value={draft.ord ?? 0} onChange={(e) => setDraft({...draft, ord: Number(e.target.value)})} placeholder="Ordre" />
                      </div>
                      <Textarea rows={6} value={draft.full_text || ""} onChange={(e) => setDraft({...draft, full_text: e.target.value})} placeholder="Texte complet" />
                      <Textarea rows={4} value={draft.summary || ""} onChange={(e) => setDraft({...draft, summary: e.target.value})} placeholder="Résumé" />
                      <Textarea rows={3} value={draft.traps || ""} onChange={(e) => setDraft({...draft, traps: e.target.value})} placeholder="Pièges du prof" />
                      <Textarea rows={3} value={draft.mini_case || ""} onChange={(e) => setDraft({...draft, mini_case: e.target.value})} placeholder="Mini-cas clinique" />
                      <div className="grid sm:grid-cols-4 gap-2">
                        <Input value={draft.image_url || ""} onChange={(e) => setDraft({...draft, image_url: e.target.value})} placeholder="Lien image" />
                        <Input value={draft.video_url || ""} onChange={(e) => setDraft({...draft, video_url: e.target.value})} placeholder="Lien vidéo" />
                        <Input value={draft.audio_url || ""} onChange={(e) => setDraft({...draft, audio_url: e.target.value})} placeholder="Lien audio" />
                        <Input value={draft.resource_url || ""} onChange={(e) => setDraft({...draft, resource_url: e.target.value})} placeholder="Lien ressource" />
                      </div>
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
                    <Button size="sm" variant="outline" disabled={busy==="cq"+l.id} onClick={() => run("cq"+l.id, async () => { const r = await createQuestionFn({ data: { moduleId, lessonId: l.id } }); await refresh(); const created = { id: r.id, stem: "Nouvelle question", ord: lessonQs.length, choices: [] }; startQuestionEdit(created); }, "QCM créé") }>
                      <Plus className="h-3 w-3" /> QCM manuel
                    </Button>
                  </div>
                  {lessonQs.length > 0 && (
                    <details className="text-sm" open>
                      <summary className="cursor-pointer font-bold">Éditer les {lessonQs.length} QCM</summary>
                      <div className="space-y-2 mt-2">
                        {lessonQs.map((q) => (
                          <div key={q.id} className="rounded-xl border-2 p-3 text-xs bg-card space-y-2">
                            {editingQuestion === q.id ? (
                              <div className="space-y-3">
                                <div className="grid sm:grid-cols-[1fr_80px] gap-2">
                                  <Textarea rows={3} value={questionDraft.stem || ""} onChange={(e) => setQuestionDraft({...questionDraft, stem: e.target.value})} placeholder="Énoncé" />
                                  <Input type="number" value={questionDraft.ord ?? 0} onChange={(e) => setQuestionDraft({...questionDraft, ord: Number(e.target.value)})} placeholder="Ordre" />
                                </div>
                                <div className="grid sm:grid-cols-4 gap-2">
                                  <Input value={questionDraft.teacher_note || ""} onChange={(e) => setQuestionDraft({...questionDraft, teacher_note: e.target.value})} placeholder="Note explicative" />
                                  <Input value={questionDraft.image_url || ""} onChange={(e) => setQuestionDraft({...questionDraft, image_url: e.target.value})} placeholder="Lien image" />
                                  <Input value={questionDraft.video_url || ""} onChange={(e) => setQuestionDraft({...questionDraft, video_url: e.target.value})} placeholder="Lien vidéo" />
                                  <Input value={questionDraft.audio_url || ""} onChange={(e) => setQuestionDraft({...questionDraft, audio_url: e.target.value})} placeholder="Lien audio" />
                                </div>
                                <div className="space-y-2">
                                  {(questionDraft.choices ?? []).map((c: any, i: number) => (
                                    <div key={`${q.id}-${i}`} className="grid sm:grid-cols-[48px_1fr_1fr_90px] gap-2 items-center rounded-lg bg-muted/50 p-2">
                                      <Input value={c.letter} onChange={(e) => updateChoice(i, { letter: e.target.value.toLowerCase() })} />
                                      <Input value={c.text || ""} onChange={(e) => updateChoice(i, { text: e.target.value })} placeholder="Proposition" />
                                      <Input value={c.explanation || ""} onChange={(e) => updateChoice(i, { explanation: e.target.value })} placeholder="Explication" />
                                      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={!!c.is_correct} onChange={(e) => updateChoice(i, { is_correct: e.target.checked })} /> Vraie</label>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <DuoButton size="sm" variant="primary" disabled={busy==="uq"+q.id} onClick={() => run("uq"+q.id, () => updateQuestionFn({ data: { id: q.id, ...questionDraft } }).then(() => setEditingQuestion(null)), "QCM mis à jour")}>Enregistrer QCM</DuoButton>
                                  <Button size="sm" variant="outline" onClick={() => setQuestionDraft({ ...questionDraft, choices: [...(questionDraft.choices ?? []), { letter: String.fromCharCode(97 + (questionDraft.choices?.length ?? 0)), text: "", is_correct: false, explanation: "" }] })}>+ proposition</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(null)}>Annuler</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between gap-2">
                                  <p className="font-semibold flex-1">{q.stem}</p>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" onClick={() => startQuestionEdit(q)}>Éditer</Button>
                                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer ce QCM ?")) run("dq"+q.id, () => deleteQuestionFn({ data: { id: q.id } }), "QCM supprimé"); }}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {q.teacher_note && <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 font-bold text-primary"><StickyNote className="h-3 w-3" /> note</span>}
                                  {q.image_url && <span className="inline-flex items-center gap-1 rounded bg-sky/15 px-2 py-0.5 font-bold text-sky"><Image className="h-3 w-3" /> image</span>}
                                  {q.video_url && <span className="inline-flex items-center gap-1 rounded bg-xp/15 px-2 py-0.5 font-bold text-xp"><Video className="h-3 w-3" /> vidéo</span>}
                                  {q.audio_url && <span className="inline-flex items-center gap-1 rounded bg-heart/10 px-2 py-0.5 font-bold text-heart"><Volume2 className="h-3 w-3" /> audio</span>}
                                </div>
                                <ul className="mt-1 space-y-0.5">
                                  {(q.choices ?? []).slice().sort((a:any,b:any)=>a.letter.localeCompare(b.letter)).map((c:any) => (
                                    <li key={c.id} className={c.is_correct ? "text-success font-bold" : ""}>
                                      {c.is_correct ? "✓" : "·"} <b>{c.letter})</b> {c.text}
                                      {c.explanation && <span className="text-muted-foreground italic"> — {c.explanation}</span>}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
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