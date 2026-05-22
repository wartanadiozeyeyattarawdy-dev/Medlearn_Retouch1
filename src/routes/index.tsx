import { createFileRoute, Link } from "@tanstack/react-router";
import { DuoButton } from "@/components/DuoButton";
import { Flame, Heart, Zap, Trophy, Brain, Swords, Sparkles, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "MedLearn — Apprends la médecine comme un jeu" },
      { name: "description", content: "Plateforme andragogique gamifiée pour étudiants en médecine : leçons, combats QCM, tuteur IA, XP, séries et badges." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <header className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2 font-extrabold text-xl">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><GraduationCap className="h-6 w-6" /></div>
          MedLearn
        </div>
        <Link to="/auth"><DuoButton variant="ghost" size="sm">Se connecter</DuoButton></Link>
      </header>

      <main className="container mx-auto px-6 pt-10 pb-24">
        <section className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="text-center lg:text-left animate-bounce-in">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="h-3 w-3" /> Apprends sans résistance
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              La médecine, <span className="text-primary">addictive</span> comme un jeu.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Cours, résumés, combats QCM expliqués, tuteur IA contextuel. Gagne de l'XP, garde ta série, débloque des badges — apprends parce que tu veux y revenir.
            </p>
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link to="/auth"><DuoButton variant="primary" size="lg">Commencer gratuitement</DuoButton></Link>
              <Link to="/auth"><DuoButton variant="ghost" size="lg">J'ai déjà un compte</DuoButton></Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-6 text-sm">
              {[
                { icon: Flame, color: "text-streak", label: "Séries quotidiennes" },
                { icon: Zap, color: "text-xp", label: "XP & niveaux" },
                { icon: Heart, color: "text-heart", label: "Cœurs & focus" },
                { icon: Trophy, color: "text-primary", label: "Classement" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 font-bold">
                  <f.icon className={`h-5 w-5 fill-current ${f.color}`} />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="duo-card p-6 animate-pop max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-streak/10 text-streak font-bold text-sm">
                    <Flame className="h-4 w-4 fill-current" /> 12
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-xp/15 text-xp font-bold text-sm">
                    <Zap className="h-4 w-4 fill-current" /> 840
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Heart key={i} className={`h-4 w-4 fill-current ${i<=4?'text-heart':'text-muted'}`} />)}
                </div>
              </div>
              <h3 className="font-extrabold mb-3">Sémiologie neurologique</h3>
              <p className="text-sm font-bold mb-3 text-muted-foreground">Question 3 / 8</p>
              <p className="font-semibold mb-4">Quel signe caractérise un syndrome pyramidal ?</p>
              <div className="space-y-2">
                {[
                  { l: "A", t: "Tremblement de repos", ok: false },
                  { l: "B", t: "Babinski positif", ok: true },
                  { l: "C", t: "Hypotonie globale", ok: false },
                ].map((c) => (
                  <div key={c.l} className={`duo-card p-3 flex items-center gap-3 ${c.ok ? 'border-success bg-success/10' : ''}`}>
                    <span className={`h-7 w-7 grid place-items-center rounded-lg font-extrabold text-sm ${c.ok?'bg-success text-success-foreground':'bg-muted'}`}>{c.l}</span>
                    <span className="font-semibold text-sm">{c.t}</span>
                  </div>
                ))}
              </div>
              <DuoButton variant="success" className="w-full mt-4">+10 XP — Valider</DuoButton>
            </div>
            <div className="absolute -top-6 -right-4 grid h-16 w-16 place-items-center rounded-full bg-streak text-white text-3xl shadow-lg animate-pulse-soft">🔥</div>
            <div className="absolute -bottom-4 -left-4 grid h-14 w-14 place-items-center rounded-full bg-xp text-white text-2xl shadow-lg" style={{animation:'pop 0.4s 0.3s both'}}>⭐</div>
          </div>
        </section>

        <section className="mt-24 grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[
            { icon: Brain, t: "Cours sourcés", d: "Tes propres polycopiés digérés par l'IA en leçons, résumés, pièges et mini-cas." , color:"bg-sky/15 text-sky" },
            { icon: Swords, t: "Combats QCM", d: "Chaque proposition expliquée. Tu perds un cœur si tu rates — ça te force à comprendre.", color:"bg-heart/10 text-heart" },
            { icon: Sparkles, t: "Tuteur IA contextuel", d: "Pose une question : il sait quelle leçon, quel QCM, quelle abréviation tu regardes.", color:"bg-primary/10 text-primary" },
          ].map((f, i) => (
            <div key={i} className="duo-card p-6">
              <div className={`grid h-12 w-12 place-items-center rounded-xl mb-4 ${f.color}`}><f.icon className="h-6 w-6" /></div>
              <h3 className="font-extrabold text-lg">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 text-center">
          <h2 className="text-3xl font-extrabold">Prêt à dompter ton externat ?</h2>
          <p className="text-muted-foreground mt-2">Crée ton compte, choisis un module, garde ta série.</p>
          <Link to="/auth"><DuoButton variant="primary" size="lg" className="mt-6">Commencer maintenant</DuoButton></Link>
        </section>
      </main>
    </div>
  );
}
