import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { getModule } from "@/lib/catalog.functions";
import { getQuestions, generateAIQuestions } from "@/lib/qcm.functions";
import { AppNav } from "@/components/AppNav";
import { ChatDrawer } from "@/components/ChatDrawer";
import { QcmRunner } from "@/components/QcmRunner";
import { AbbreviationText } from "@/components/AbbreviationText";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/modules/$moduleId")({
  component: ModulePage,
});

function ModulePage() {
  const { moduleId } = useParams({ from: "/modules/$moduleId" });
  const { me, loading } = useMe();
  const getModuleFn = useServerFn(getModule);
  const getQFn = useServerFn(getQuestions);
  const genFn = useServerFn(generateAIQuestions);
  const [mod, setMod] = useState<any>(null);
  const [adminQ, setAdminQ] = useState<any[]>([]);
  const [aiQ, setAiQ] = useState<any[]>([]);
  const [activeQ, setActiveQ] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!me) return;
    getModuleFn({ data: { id: moduleId } }).then((r) => {
      setMod(r);
      setActiveLesson(r.lessons[0]?.id ?? null);
    });
    getQFn({ data: { moduleId, source: "admin" } }).then(setAdminQ);
    getQFn({ data: { moduleId, source: "ai" } }).then(setAiQ);
  }, [me, moduleId, getModuleFn, getQFn]);

  if (loading || !me || !mod) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!mod.module) {
    return <div className="p-8"><Link to="/modules" className="underline">← Retour</Link><p>Module introuvable.</p></div>;
  }

  const lesson = mod.lessons.find((l: any) => l.id === activeLesson);

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me.isAdmin} />
      <main className="container mx-auto p-6 space-y-4">
        <div>
          <Link to="/modules" className="text-sm text-muted-foreground hover:underline">← Modules</Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-1">
            <span>{mod.module.emoji}</span> {mod.module.name}
          </h1>
          {mod.module.description && <p className="text-muted-foreground mt-1">{mod.module.description}</p>}
          {mod.module.learning_info && (
            <Card className="mt-3 bg-muted/50">
              <CardContent className="pt-4 text-sm whitespace-pre-wrap">{mod.module.learning_info}</CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="lessons">
          <TabsList>
            <TabsTrigger value="lessons">Leçons</TabsTrigger>
            <TabsTrigger value="summaries">Résumés</TabsTrigger>
            <TabsTrigger value="combat">Combat (admin)</TabsTrigger>
            <TabsTrigger value="combat-ai">Combat IA</TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {mod.lessons.map((l: any) => (
                <Button key={l.id} variant={activeLesson === l.id ? "default" : "outline"} size="sm" onClick={() => setActiveLesson(l.id)}>
                  {l.title}
                </Button>
              ))}
            </div>
            {lesson && (
              <Card>
                <CardHeader><CardTitle>{lesson.title}</CardTitle></CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <AbbreviationText text={lesson.full_text || lesson.summary} abbreviations={mod.abbreviations} />
                  {lesson.traps && (
                    <div className="mt-6 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4">
                      <p className="font-semibold">⚠ Pièges du prof</p>
                      <AbbreviationText text={lesson.traps} abbreviations={mod.abbreviations} />
                    </div>
                  )}
                  {lesson.mini_case && (
                    <div className="mt-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4">
                      <p className="font-semibold">🧪 Mini-cas</p>
                      <AbbreviationText text={lesson.mini_case} abbreviations={mod.abbreviations} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="summaries" className="space-y-3">
            {mod.lessons.map((l: any) => (
              <Card key={l.id}>
                <CardHeader><CardTitle>{l.title}</CardTitle></CardHeader>
                <CardContent>
                  <AbbreviationText text={l.summary || "(pas de résumé)"} abbreviations={mod.abbreviations} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="combat">
            <QcmRunner questions={adminQ as any} abbreviations={mod.abbreviations} onActiveQuestion={setActiveQ} />
          </TabsContent>

          <TabsContent value="combat-ai" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">QCM générés par l'IA à partir du cours.</p>
              <Button
                size="sm"
                disabled={generating}
                onClick={async () => {
                  setGenerating(true);
                  try {
                    await genFn({ data: { moduleId, count: 8 } });
                    const r = await getQFn({ data: { moduleId, source: "ai" } });
                    setAiQ(r);
                  } finally {
                    setGenerating(false);
                  }
                }}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {generating ? "Génération..." : "Régénérer 8 QCM"}
              </Button>
            </div>
            <QcmRunner questions={aiQ as any} abbreviations={mod.abbreviations} onActiveQuestion={setActiveQ} />
          </TabsContent>
        </Tabs>
      </main>
      <ChatDrawer
        context={{
          scope: activeQ ? "qcm" : "module",
          moduleId,
          lessonId: activeLesson ?? undefined,
          questionId: activeQ ?? undefined,
          pageHint: `Module ${mod.module.name}`,
        }}
      />
    </div>
  );
}