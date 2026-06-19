import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { getModule } from "@/lib/catalog.functions";
import { getQuestions, generateAIQuestions } from "@/lib/qcm.functions";
import { getModuleProgress, markLessonViewed } from "@/lib/gamification.functions";
import { AppNav } from "@/components/AppNav";
import { ChatDrawer } from "@/components/ChatDrawer";
import { QcmRunner } from "@/components/QcmRunner";
import { AbbreviationText } from "@/components/AbbreviationText";
import { DuoButton } from "@/components/DuoButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Sparkles, BookOpen, Swords, Bot, FileText, ChevronLeft, Check, Lock, Image, Video, Volume2, LinkIcon } from "lucide-react";

export const Route = createFileRoute("/modules/$moduleId")({ component: ModulePage });

type Lesson = { id: string; title: string; full_text: string; summary: string; traps: string | null; mini_case: string | null; image_url?: string | null; video_url?: string | null; audio_url?: string | null; resource_url?: string | null; ord: number };
type Abbr = { short: string; full_form: string };

function ModulePage() {
  const { moduleId } = useParams({ from: "/modules/$moduleId" });
  const { me, loading } = useMe();
  const { stats, refresh: refreshStats } = useStats();
  const getModuleFn = useServerFn(getModule);
  const getQFn = useServerFn(getQuestions);
  const genFn = useServerFn(generateAIQuestions);
  const progressFn = useServerFn(getModuleProgress);
  const markViewedFn = useServerFn(markLessonViewed);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mod, setMod] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminQ, setAdminQ] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiQ, setAiQ] = useState<any[]>([]);
  const [progress, setProgress] = useState<{ lesson_id: string; viewed_at: string | null }[]>([]);
  const [activeQ, setActiveQ] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiTimer, setAiTimer] = useState(0);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [tab, setTab] = useState("path");

  const reloadProgress = useCallback(() => {
    progressFn({ data: { moduleId } }).then((r) => setProgress(r as { lesson_id: string; viewed_at: string | null }[]));
  }, [progressFn, moduleId]);

  useEffect(() => {
    if (!me) return;
    getModuleFn({ data: { id: moduleId } }).then((r) => {
      setMod(r);
      setActiveLesson(r.lessons[0]?.id ?? null);
    });
    getQFn({ data: { moduleId, source: "admin" } }).then(setAdminQ);
    getQFn({ data: { moduleId, source: "ai" } }).then(setAiQ);
    reloadProgress();
  }, [me, moduleId, getModuleFn, getQFn, reloadProgress]);

  useEffect(() => {
    if (activeLesson && tab === "lessons") {
      markViewedFn({ data: { lessonId: activeLesson, moduleId } }).then(reloadProgress).catch(() => {});
    }
  }, [activeLesson, tab, moduleId, markViewedFn, reloadProgress]);

  useEffect(() => {
    if (!generating) return;
    setAiTimer(0);
    const interval = setInterval(() => setAiTimer((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [generating]);

  if (loading || !me || !mod) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!mod.module) return <div className="p-8"><Link to="/modules" className="underline">← Retour</Link><p>Module introuvable.</p></div>;

  const abbreviations = mod.abbreviations as Abbr[];
  const lessons = mod.lessons as Lesson[];
  const lesson = lessons.find((l) => l.id === activeLesson);
  const viewedSet = new Set(progress.filter((p) => p.viewed_at).map((p) => p.lesson_id));

  return (
    <div className="min-h-screen pb-20">
      <AppNav isAdmin={me.isAdmin} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 space-y-5 max-w-5xl">
        <Link to="/modules" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-bold">
          <ChevronLeft className="h-4 w-4" /> Modules
        </Link>

        <div className="duo-card p-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{mod.module.emoji}</div>
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold">{mod.module.name}</h1>
              {mod.module.description && <p className="text-muted-foreground mt-1">{mod.module.description}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">{lessons.length} leçons</span>
                <span className="px-3 py-1 rounded-full bg-heart/10 text-heart">{adminQ.length} QCM prof</span>
                <span className="px-3 py-1 rounded-full bg-sky/15 text-sky">{aiQ.length} QCM IA</span>
                <span className="px-3 py-1 rounded-full bg-xp/15 text-xp">{viewedSet.size}/{lessons.length} vues</span>
              </div>
            </div>
          </div>
          {mod.module.learning_info && (
            <div className="mt-4 p-4 rounded-xl bg-accent/40 text-sm whitespace-pre-wrap">{mod.module.learning_info}</div>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1 h-auto p-1 rounded-xl bg-muted">
            <TabsTrigger value="path" className="rounded-lg font-bold gap-1"><Sparkles className="h-4 w-4" />Parcours</TabsTrigger>
            <TabsTrigger value="lessons" className="rounded-lg font-bold gap-1"><BookOpen className="h-4 w-4" />Leçons</TabsTrigger>
            <TabsTrigger value="summaries" className="rounded-lg font-bold gap-1"><FileText className="h-4 w-4" />Résumés</TabsTrigger>
            <TabsTrigger value="combat" className="rounded-lg font-bold gap-1"><Swords className="h-4 w-4" />Combat</TabsTrigger>
            <TabsTrigger value="combat-ai" className="rounded-lg font-bold gap-1"><Bot className="h-4 w-4" />IA</TabsTrigger>
          </TabsList>

          {/* PATH — Duolingo-style lesson tree */}
          <TabsContent value="path" className="mt-5">
            <div className="duo-card p-6">
              <h2 className="font-extrabold text-xl mb-4">Ton parcours</h2>
              <div className="flex flex-col items-center gap-1 py-4">
                {lessons.map((l, i) => {
                  const viewed = viewedSet.has(l.id);
                  const offset = (i % 4 === 1 ? 60 : i % 4 === 2 ? 0 : i % 4 === 3 ? -60 : 0);
                  return (
                    <div key={l.id} className="flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                      <button
                        onClick={() => { setActiveLesson(l.id); setTab("lessons"); }}
                        className={`lesson-node ${viewed ? 'lesson-node-done' : i === 0 || viewedSet.has(lessons[i-1]?.id) ? 'lesson-node-active' : 'lesson-node-active'}`}
                        title={l.title}
                      >
                        {viewed ? <Check className="h-7 w-7" /> : <span className="text-2xl font-extrabold">{i+1}</span>}
                      </button>
                      <span className="text-xs font-bold mt-2 text-center max-w-[160px] line-clamp-1">{l.title}</span>
                      {i < lessons.length - 1 && <div className="h-8 w-1 bg-border rounded-full my-1" />}
                    </div>
                  );
                })}
                {lessons.length === 0 && <p className="text-muted-foreground">Aucune leçon. {me.isAdmin && <Link to="/admin" className="underline text-primary">Ajouter →</Link>}</p>}
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                <DuoButton variant="primary" onClick={() => setTab("combat")} disabled={adminQ.length===0}>
                  <Swords className="h-4 w-4" /> Combat prof ({adminQ.length})
                </DuoButton>
                <DuoButton variant="ghost" onClick={() => setTab("combat-ai")}>
                  <Bot className="h-4 w-4" /> Combat IA ({aiQ.length})
                </DuoButton>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lessons" className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {lessons.map((l) => {
                const viewed = viewedSet.has(l.id);
                return (
                  <button key={l.id} onClick={() => setActiveLesson(l.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 flex items-center gap-1 ${activeLesson===l.id?'border-primary bg-primary text-primary-foreground':'border-border bg-card'}`}>
                    {viewed ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3 opacity-40" />}
                    {l.title}
                  </button>
                );
              })}
            </div>
            {lesson && (
              <div className="duo-card p-6 space-y-4">
                <h2 className="text-2xl font-extrabold">{lesson.title}</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  <AbbreviationText text={lesson.full_text || lesson.summary} abbreviations={abbreviations} />
                </div>
                {lesson.traps && (
                  <div className="rounded-xl border-l-4 border-warning bg-warning/10 p-4">
                    <p className="font-extrabold mb-1">⚠️ Pièges du prof</p>
                    <div className="text-sm whitespace-pre-wrap"><AbbreviationText text={lesson.traps} abbreviations={abbreviations} /></div>
                  </div>
                )}
                {lesson.mini_case && (
                  <div className="rounded-xl border-l-4 border-sky bg-sky/10 p-4">
                    <p className="font-extrabold mb-1">🧪 Mini-cas clinique</p>
                    <div className="text-sm whitespace-pre-wrap"><AbbreviationText text={lesson.mini_case} abbreviations={abbreviations} /></div>
                  </div>
                )}
                {(lesson.image_url || lesson.video_url || lesson.audio_url || lesson.resource_url) && (
                  <div className="flex flex-wrap gap-2 border-t-2 border-border pt-4">
                    {lesson.image_url && <a href={lesson.image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-extrabold hover:border-primary"><Image className="h-4 w-4 text-primary" /> Image</a>}
                    {lesson.video_url && <a href={lesson.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-extrabold hover:border-primary"><Video className="h-4 w-4 text-primary" /> Vidéo</a>}
                    {lesson.audio_url && <a href={lesson.audio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-extrabold hover:border-primary"><Volume2 className="h-4 w-4 text-primary" /> Audio</a>}
                    {lesson.resource_url && <a href={lesson.resource_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-extrabold hover:border-primary"><LinkIcon className="h-4 w-4 text-primary" /> Ressource</a>}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summaries" className="mt-5 space-y-3">
            {lessons.map((l) => (
              <div key={l.id} className="duo-card p-5">
                <h3 className="font-extrabold text-lg mb-2">{l.title}</h3>
                <div className="text-sm whitespace-pre-wrap"><AbbreviationText text={l.summary || "(pas de résumé)"} abbreviations={abbreviations} /></div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="combat" className="mt-5">
            <QcmRunner questions={adminQ} abbreviations={abbreviations} onActiveQuestion={setActiveQ} onStatsChange={refreshStats} />
          </TabsContent>

          <TabsContent value="combat-ai" className="mt-5 space-y-3">
            <div className="flex justify-between items-center gap-3">
              <p className="text-sm text-muted-foreground">QCM générés par l'IA à partir du cours.</p>
              <DuoButton variant="ghost" size="sm" disabled={generating}
                onClick={async () => {
                  setGenerating(true); setAiMsg(null);
                  try {
                    const generated = await genFn({ data: { moduleId, count: 8 } });
                    const r = await getQFn({ data: { moduleId, source: "ai" } }); setAiQ(r);
                    setAiMsg(`${generated.count} QCM IA prêts.`);
                  } catch (error) {
                    setAiMsg((error as Error).message);
                  } finally { setGenerating(false); }
                }}>
                <Sparkles className="h-4 w-4" /> {generating ? `Génération ${aiTimer}s` : "Régénérer 8 QCM"}
              </DuoButton>
            </div>
            {generating && (
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 animate-slide-up">
                <div className="flex justify-between text-sm font-extrabold"><span>Création du Combat IA</span><span>{aiTimer}s · env. 20-60s</span></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.min(96, 12 + aiTimer * 3)}%` }} /></div>
              </div>
            )}
            {aiMsg && <p className="text-sm font-bold text-muted-foreground">{aiMsg}</p>}
            <QcmRunner questions={aiQ} abbreviations={abbreviations} onActiveQuestion={setActiveQ} onStatsChange={refreshStats} />
          </TabsContent>
        </Tabs>
      </main>
      <ChatDrawer context={{ scope: activeQ ? "qcm" : "module", moduleId, lessonId: activeLesson ?? undefined, questionId: activeQ ?? undefined, pageHint: `Module ${mod.module.name}` }} />
    </div>
  );
}
