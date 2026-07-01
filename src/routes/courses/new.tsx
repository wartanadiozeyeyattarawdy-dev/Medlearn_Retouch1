import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { createProfessorCourse } from "@/lib/social.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/courses/new")({
  component: NewCoursePage,
});

function NewCoursePage() {
  const { me, loading } = useMe();
  const navigate = useNavigate();
  const createFn = useServerFn(createProfessorCourse);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "all" as "beginner" | "intermediate" | "advanced" | "all",
    price: 0,
    isFree: true,
    tags: "",
    videoUrl: "",
    thumbnailUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !me) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Vérifier si l'utilisateur peut créer un cours
  const canCreate = me.isAdmin || me.profile?.is_professor;
  if (!canCreate) {
    return (
      <div className="min-h-screen">
        <AppNav isAdmin={me.isAdmin} />
        <main className="container mx-auto p-6 max-w-2xl">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-extrabold">🔒 Accès réservé</h2>
              <p className="text-muted-foreground mt-2">
                Seuls les professeurs peuvent créer des cours.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Contacte un administrateur pour obtenir le statut de professeur.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createFn({
        data: {
          title: form.title,
          description: form.description,
          category: form.category,
          level: form.level,
          price: form.price,
          isFree: form.isFree,
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
          videoUrl: form.videoUrl || undefined,
          thumbnailUrl: form.thumbnailUrl || undefined,
          moduleId: null,
        },
      });
      navigate({ to: "/courses" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me.isAdmin} />
      <main className="container mx-auto p-4 sm:p-6 max-w-2xl">
        <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-bold">
          <ArrowLeft className="h-4 w-4" /> Retour aux cours
        </Link>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>📝 Créer un cours</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Titre du cours"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Décris ton cours..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Ex: Médecine, Biologie..."
                  />
                </div>
                <div>
                  <Label>Niveau *</Label>
                  <select
                    className="w-full rounded-lg border-2 p-2 bg-background"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as any })}
                  >
                    <option value="beginner">Débutant</option>
                    <option value="intermediate">Intermédiaire</option>
                    <option value="advanced">Avancé</option>
                    <option value="all">Tous niveaux</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prix (MAD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    disabled={form.isFree}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isFree}
                      onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-bold">Gratuit</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>URL de la vidéo (YouTube, Vimeo...)</Label>
                <Input
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div>
                <Label>URL de la miniature</Label>
                <Input
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  placeholder="https://.../image.jpg"
                />
              </div>

              <div>
                <Label>Tags (séparés par des virgules)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="médecine, sémiologie, neurologie..."
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <DuoButton
                type="submit"
                variant="primary"
                disabled={isSubmitting || !form.title}
                className="w-full"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Créer le cours
              </DuoButton>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}