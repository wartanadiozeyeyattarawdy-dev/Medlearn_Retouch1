import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { getFollowers, getFollowing, toggleFollow, getFollowStatus } from "@/lib/social.functions";
import { getModuleProgress } from "@/lib/gamification.functions";
import { AppNav } from "@/components/AppNav";
import { FollowButton } from "@/components/FollowButton";
import { RatingStars } from "@/components/RatingStars";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Loader2, 
  ArrowLeft, 
  Users, 
  Award, 
  BookOpen, 
  Star, 
  Calendar,
  MapPin,
  GraduationCap,
  CheckCircle,
  MessageCircle,
  Mail,
  Twitter,
  Linkedin,
  Globe
} from "lucide-react";

export const Route = createFileRoute("/following/")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = useParams({ from: "/profile/$userId" });
  const { me, loading } = useMe();
  const { stats } = useStats();
  const [profile, setProfile] = useState<any>(null);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [progress, setProgress] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Charger le profil
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);

      // Charger les followers
      const followersData = await getFollowers({ data: { userId } });
      setFollowers(followersData);

      // Charger les following
      const followingData = await getFollowing({ data: { userId } });
      setFollowing(followingData);

      // Vérifier si je suis cet utilisateur
      if (me && me.userId !== userId) {
        const status = await getFollowStatus({ data: { targetUserId: userId } });
        setIsFollowing(status.following);
      }

      // Charger la progression
      const progressFn = useServerFn(getModuleProgress);
      // TODO: Récupérer la progression de l'utilisateur
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Profil introuvable</div>;
  }

  const isOwnProfile = me?.userId === userId;

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me?.isAdmin || false} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 max-w-5xl">
        <Link to="/modules" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-bold">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        {/* En-tête du profil */}
        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="text-7xl">{profile.avatar_emoji || "👤"}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-extrabold">{profile.full_name || "Anonyme"}</h1>
                  {profile.is_verified && (
                    <CheckCircle className="h-5 w-5 text-primary fill-primary" />
                  )}
                </div>
                {profile.specialization && (
                  <p className="text-muted-foreground">{profile.specialization}</p>
                )}
                {profile.institution && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" /> {profile.institution}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-sm mt-2">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {followers.length} abonnés
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {following.length} abonnements
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {profile.rating || 0} ({profile.total_reviews || 0} avis)
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Membre depuis {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {!isOwnProfile && (
                  <FollowButton 
                    targetUserId={userId} 
                    onFollowChange={setIsFollowing}
                  />
                )}
                {isOwnProfile && (
                  <Link to="/settings">
                    <DuoButton variant="ghost" size="sm">
                      <Settings className="h-4 w-4" /> Modifier le profil
                    </DuoButton>
                  </Link>
                )}
                <Link to="/chat" params={{ userId }}>
                  <DuoButton variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4" /> Message
                  </DuoButton>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="duo-card p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{stats?.xp || 0}</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </div>
          <div className="duo-card p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{stats?.level || 1}</p>
            <p className="text-xs text-muted-foreground">Niveau</p>
          </div>
          <div className="duo-card p-3 text-center">
            <p className="text-2xl font-extrabold text-streak">{stats?.streak_days || 0}</p>
            <p className="text-xs text-muted-foreground">Série 🔥</p>
          </div>
          <div className="duo-card p-3 text-center">
            <p className="text-2xl font-extrabold text-heart">{stats?.hearts || 5}</p>
            <p className="text-xs text-muted-foreground">Cœurs ❤️</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid grid-cols-4 gap-1 h-auto p-1 rounded-xl bg-muted">
            <TabsTrigger value="overview" className="rounded-lg font-bold">Aperçu</TabsTrigger>
            <TabsTrigger value="services" className="rounded-lg font-bold">Services</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-lg font-bold">Cours</TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-lg font-bold">Succès</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4">
              {/* Activité récente */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 Activité récente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Aucune activité récente à afficher
                  </p>
                </CardContent>
              </Card>

              {/* Abonnements */}
              <Card>
                <CardHeader>
                  <CardTitle>👥 Abonnements récents</CardTitle>
                </CardHeader>
                <CardContent>
                  {following.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucun abonnement</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {following.slice(0, 6).map((f) => (
                        <Link 
                          key={f.following_id} 
                          to="/profile/$userId" 
                          params={{ userId: f.following_id }}
                          className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg hover:bg-accent"
                        >
                          <span>{f.profiles?.avatar_emoji || "👤"}</span>
                          <span className="text-sm font-bold">{f.profiles?.full_name || "Anonyme"}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>📚 Services publiés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Aucun service publié pour le moment
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>🎓 Cours créés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Aucun cours créé pour le moment
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>🏆 Succès débloqués</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Aucun succès débloqué
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Ajouter l'import Settings
import { Settings } from "lucide-react";