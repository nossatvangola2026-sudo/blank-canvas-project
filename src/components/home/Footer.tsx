import { Play, Instagram, Facebook, MessageCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary glow-sm">
                <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Make<span className="text-primary">Money</span>
              </span>
            </div>
            <p className="text-muted-foreground max-w-sm">
              A plataforma líder em Angola para ganhar dinheiro assistindo vídeos do YouTube. Simples, seguro e rápido.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Links</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">Redes Sociais</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-lg glass flex items-center justify-center hover:border-primary/50 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg glass flex items-center justify-center hover:border-primary/50 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg glass flex items-center justify-center hover:border-primary/50 transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
          <p>© 2024 MakeMoney YouTube. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
