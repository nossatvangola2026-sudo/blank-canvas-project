import { Play, Wallet, LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary glow-sm">
              <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Make<span className="text-primary">Money</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#tasks" className="text-muted-foreground hover:text-foreground transition-colors">
              Tarefas
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              Como Funciona
            </a>
            <a href="#withdraw" className="text-muted-foreground hover:text-foreground transition-colors">
              Sacar
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {!isLoading && user ? (
              <>
                <Button variant="glass" size="sm" onClick={() => navigate('/dashboard')}>
                  <Wallet className="h-4 w-4" />
                  <span>Kz {profile?.balance?.toFixed(2) || '0,00'}</span>
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate('/dashboard')}>
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="glass" size="sm" className="hidden sm:flex">
                  <Wallet className="h-4 w-4" />
                  <span>Kz 0,00</span>
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate('/auth')}>
                  <LogIn className="h-4 w-4" />
                  <span>Entrar</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
