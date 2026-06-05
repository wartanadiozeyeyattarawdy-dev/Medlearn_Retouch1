import { useEffect } from "react";
import { applyTheme, getInitialTheme } from "@/lib/themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
  return <>{children}</>;
}