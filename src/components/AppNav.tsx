import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Shield, LogOut } from "lucide-react";

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link to="/modules" className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap className="h-6 w-6 text-primary" />
          MedLearn
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/modules">
            <Button variant="ghost" size="sm">Modules</Button>
          </Link>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}