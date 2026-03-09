import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard, Shield, Users, FileText, Bot, BarChart3 } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
              <LayoutDashboard className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-serif font-bold text-foreground">
                Family Office
              </h1>
              <p className="text-lg text-primary font-medium mt-1">Management Platform</p>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            Plataforma colaborativa para gestão do projeto de estruturação do Family Office MMLaw.
            Acompanhe sprints, gerencie documentos e consulte a IA assistente.
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
            {[
              { icon: BarChart3, label: "Dashboard & Gantt", desc: "Visualização de progresso" },
              { icon: Users, label: "Equipe", desc: "Gestão de membros" },
              { icon: FileText, label: "Documentos", desc: "Repositório seguro" },
              { icon: Bot, label: "Chat com IA", desc: "Consulta inteligente" },
              { icon: Shield, label: "Acesso Seguro", desc: "Autenticação OAuth" },
              { icon: LayoutDashboard, label: "Sprints", desc: "6 semanas de projeto" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-2">
            <Button
              onClick={() => { window.location.href = getLoginUrl(); }}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-6 text-base font-semibold shadow-lg shadow-primary/20 rounded-xl"
            >
              Entrar na Plataforma
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Acesso exclusivo para membros da equipe MMLaw
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © 2025 Family Office Management Platform · MMLaw
        </p>
      </footer>
    </div>
  );
}
