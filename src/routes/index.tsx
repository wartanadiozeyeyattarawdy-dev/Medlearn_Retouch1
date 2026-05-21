import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, Brain, MessagesSquare, Swords } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "MedLearn — Apprendre la médecine sans résistance" },
      {
        name: "description",
        content:
          "Plateforme andragogique : leçons, résumés, combats QCM et tuteur IA contextuel pour étudiants en médecine.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap className="h-6 w-6 text-primary" /> MedLearn
        </div>
        <Link to="/auth">
          <Button>Se connecter</Button>
        </Link>
      </header>
      <main className="container mx-auto px-6 py-20 text-center max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Apprends la médecine, <span className="text-primary">à ta manière</span>.
        </h1>
        <p className="mt-6 text-xl text-muted-foreground">
          Leçons complètes, résumés, combats QCM avec explications, et un tuteur IA qui
          connaît le contexte de chaque page.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">Commencer</Button>
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-20">
          {[
            { icon: Brain, t: "Cours & résumés", d: "Leçons structurées + résumés visuels." },
            { icon: Swords, t: "Combat QCM", d: "Chaque proposition expliquée après validation." },
            { icon: MessagesSquare, t: "Tuteur IA", d: "Posez n'importe quelle question, contexte compris." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 text-left">
              <f.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
