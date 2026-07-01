import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { adminListReports, adminReviewReport } from "@/lib/hearts.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Loader2, 
  Flag, 
  Check, 
  X, 
  MessageCircle,
  Award,
  Clock,
  Users,
  Filter
} from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const { me, loading } = useMe();
  const listReportsFn = useServerFn(adminListReports);
  const reviewFn = useServerFn(adminReviewReport);
  
  const [reports, setReports] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [reward, setReward] = useState<Record<string, number>>({});
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("all");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    const data = await listReportsFn();
    setReports(data);
  };

  useEffect(() => {
    if (me?.isAdmin) refresh();
  }, [me]);

  const handleReview = async (id: string, decision: "approved" | "rejected") => {
    setBusy(id);
    try {
      await reviewFn({ 
        data: { 
          id, 
          decision, 
          reward: reward[id] ?? 5, 
          admin_note: adminNote[id] 
        } 
      });
      await refresh();
      setMsg(decision === "approved" ? "Signalement validé !" : "Signalement rejeté.");
    } catch (e) {
      setMsg("Erreur: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!me.isAdmin) return <div className="p-6">Accès refusé.</div>;

  const pendingReports = reports.filter(r => r.status === "pending");
  const approvedReports = reports.filter(r => r.status === "approved");
  const rejectedReports = reports.filter(r => r.status === "rejected");

  const filteredReports = filter === "all" ? reports :
    filter === "pending" ? pendingReports :
    filter === "approved" ? approvedReports : rejectedReports;

  return (
    <div className="min-h-screen">
      <AppNav isAdmin />
      <main className="container mx-auto p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
            <h1 className="text-3xl font-extrabold mt-2">🚩 Signalements</h1>
            <p className="text-sm text-muted-foreground">Gérer les signalements des étudiants</p>
          </div>
          <div className="flex gap-3">
            <div className="duo-card px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-xl font-extrabold text-warning">{pendingReports.length}</p>
            </div>
            <div className="duo-card px-4 py-2 text-center border-success/30">
              <p className="text-xs text-muted-foreground">Validés</p>
              <p className="text-xl font-extrabold text-success">{approvedReports.length}</p>
            </div>
            <div className="duo-card px-4 py-2 text-center border-destructive/30">
              <p className="text-xs text-muted-foreground">Rejetés</p>
              <p className="text-xl font-extrabold text-destructive">{rejectedReports.length}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Liste des signalements</CardTitle>
              <div className="flex gap-2">
                <select 
                  className="border rounded-lg px-3 py-1 text-sm bg-background"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Validés</option>
                  <option value="rejected">Rejetés</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredReports.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucun signalement</p>
            ) : (
              filteredReports.map((r) => (
                <div 
                  key={r.id} 
                  className={`border-2 rounded-xl p-4 space-y-3 ${
                    r.status === "pending" ? "border-warning/40 bg-warning/5" : 
                    r.status === "approved" ? "border-success/40 bg-success/5" : 
                    "border-muted bg-muted/10"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold">{r.user_name || "—"}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.modules?.emoji} {r.modules?.name || "—"}
                        </span>
                      </div>
                      <p className="text-sm mt-1"><span className="font-bold">Raison :</span> {r.reason}</p>
                      {r.details && (
                        <p className="text-sm text-muted-foreground italic mt-1">"{r.details}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(r.created_at).toLocaleDateString()} · 
                        QCM: {r.questions?.stem?.slice(0, 60) || "—"}
                      </p>
                    </div>
                    <span className={`text-xs font-bold rounded-full px-3 py-1 ${
                      r.status === "pending" ? "bg-warning/15 text-warning-foreground" : 
                      r.status === "approved" ? "bg-success/15 text-success" : 
                      "bg-muted text-muted-foreground"
                    }`}>
                      {r.status === "pending" ? "⏳ En attente" : 
                       r.status === "approved" ? "✓ Validé" : 
                       "✗ Rejeté"}
                    </span>
                  </div>

                  {r.status === "pending" && (
                    <div className="pt-3 border-t space-y-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="w-24">
                          <Label className="text-xs">Cœurs</Label>
                          <Input 
                            type="number" 
                            min={0} 
                            max={20} 
                            value={reward[r.id] ?? 5} 
                            onChange={(e) => setReward({...reward, [r.id]: Number(e.target.value)})} 
                          />
                        </div>
                        <div className="flex-1 min-w-[180px]">
                          <Label className="text-xs">Note admin</Label>
                          <Input 
                            placeholder="Note optionnelle" 
                            value={adminNote[r.id] ?? ""} 
                            onChange={(e) => setAdminNote({...adminNote, [r.id]: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <DuoButton 
                          size="sm" 
                          variant="primary"
                          disabled={busy === r.id}
                          onClick={() => handleReview(r.id, "approved")}
                        >
                          {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Valider + récompenser
                        </DuoButton>
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={busy === r.id}
                          onClick={() => handleReview(r.id, "rejected")}
                        >
                          <X className="h-4 w-4" /> Rejeter
                        </Button>
                      </div>
                    </div>
                  )}

                  {r.admin_note && r.status !== "pending" && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3 inline mr-1" />
                        Réponse admin: {r.admin_note}
                      </p>
                    </div>
                  )}

                  {r.status === "approved" && r.reward_given && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-success font-bold">
                        <Award className="h-3 w-3 inline mr-1" />
                        Récompense attribuée
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
            {msg && <p className="text-sm font-bold mt-3">{msg}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}