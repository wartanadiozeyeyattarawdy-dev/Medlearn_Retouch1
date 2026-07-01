import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { createStudentService } from "@/lib/social.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/services/new")({
  component: NewServicePage,
});

function NewServicePage() {
  const { me, loading } = useMe();
  const navigate = useNavigate();
  const createFn = useServerFn(createStudentService);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "summary" as "summary" | "tutoring" | "notes" | "flashcards",
    price: 0,
    isFree: true,
    tags: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !me) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
          type: form.type,
          price: form.price,
          isFree: form.isFree,
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
          moduleId: null,
        },
      });
      navigate({ to: "/services" });
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
        <Link to="/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-bold">
          <ArrowLeft className="h-4 w-4" /> Retour aux services
        </Link>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>📝 Publier un service</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Type de service *</Label>
                <select
                  className="w-full rounded-lg border-2 p-2 bg-background"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                >
                  <option value="summary">Résumé de cours</option>
                  <option value="notes">Notes de cours</option>
                  <option value="flashcards">Flashcards</option>
                  <option value="tutoring">Tutorat</option>
                </select>
              </div>

              <div>
                <Label>Titre *</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Titre de ton service"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Décris ton service..."
                />
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
                Publier le service
              </DuoButton>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}