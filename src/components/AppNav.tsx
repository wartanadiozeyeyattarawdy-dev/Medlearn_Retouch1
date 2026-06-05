import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Shield, LogOut, Trophy, BookOpen, Settings, Crown } from "lucide-react";
import { StatsBar } from "./StatsBar";
import type { Stats } from "@/hooks/use-stats";

export function AppNav({ isAdmin, stats }: { isAdmin: boolean; stats?: Stats | null }) {
  return (
    <header className="border-b-2 bg-card sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 gap-3">
        <Link to="/modules" className="flex items-center gap-2 font-extrabold text-lg">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline">MedLearn</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <StatsBar stats={stats ?? null} />
          <Link to="/modules" className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent text-sm font-bold">
            <BookOpen className="h-4 w-4" /> Modules
          </Link>
          <Link to="/profile" className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent text-sm font-bold">
            <Trophy className="h-4 w-4" /> Profil
          </Link>
          <Link to="/leaderboard" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent text-sm font-bold">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Classement</span>
          </Link>
          <Link to="/settings" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent text-sm font-bold">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Paramètres</span>
          </Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent text-sm font-bold">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
          <button
            className="p-2 rounded-lg hover:bg-accent"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            aria-label="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </header>
  );
}
