import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { getStudentService } from "@/lib/social.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Eye, Star, Calendar, User, Tag } from "lucide-react";

export const Route = createFileRoute("/services/$serviceId")({
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { serviceId } = useParams({ from: "/services/$serviceId" });
  const { me, loading } = useMe();
  const { stats } = useStats();
  const getFn = useServerFn(getStudentService);
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getFn({ data: { id: serviceId } });
      setService(data);
      setIsLoading(false);
    };
    load();
  }, [getFn, serviceId]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!service) {
    return <div className="min-h-screen flex items-center justify-center">Service introuvable</div>;
  }

  const typeLabels: Record<string, string> = {
    summary: "Résumé",
    tutoring: "Tutorat",
    notes: "Notes",
    flashcards: "Flashcards",
  };

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me?.isAdmin || false} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <Link to="/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-bold">
          <ArrowLeft className="h-4 w-4" /> Retour aux services
        </Link>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {typeLabels[service.type] || service.type}
                  </span>
                  {service.is_free ? (
                    <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded font-bold">Gratuit</span>
                  ) : (
                    <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded font-bold">{service.price} MAD</span>
                  )}
                </div>
                <CardTitle className="text-2xl mt-2">{service.title}</CardTitle>
              </div>
              <div className="flex gap-2">
                {service.file_url && (
                  <DuoButton variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </DuoButton>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {service.profiles?.full_name || "Anonyme"}
                {service.profiles?.is_verified && (
                  <span className="text-primary">✓</span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(service.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {service.views_count || 0} vues
              </span>
            </div>

            {service.module_id && service.modules && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold">Module:</span>
                <span>{service.modules.emoji} {service.modules.name}</span>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-extrabold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {service.description || "Aucune description fournie"}
              </p>
            </div>

            {service.tags?.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-extrabold mb-2 flex items-center gap-1">
                  <Tag className="h-4 w-4" /> Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {service.tags.map((tag: string) => (
                    <span key={tag} className="bg-muted px-3 py-1 rounded-lg text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {service.profiles && (
              <div className="border-t pt-4">
                <h3 className="font-extrabold mb-2">À propos de l'auteur</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{service.profiles.avatar_emoji || "👤"}</span>
                  <div>
                    <p className="font-bold">{service.profiles.full_name || "Anonyme"}</p>
                    {service.profiles.specialization && (
                      <p className="text-sm text-muted-foreground">{service.profiles.specialization}</p>
                    )}
                    {service.profiles.bio && (
                      <p className="text-sm text-muted-foreground">{service.profiles.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}