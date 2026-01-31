import { UserPlus, PlayCircle, Coins, Wallet } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Crie sua Conta",
    description: "Registe-se gratuitamente em menos de 1 minuto e comece a ganhar.",
  },
  {
    icon: PlayCircle,
    title: "Assista Vídeos",
    description: "Escolha vídeos da lista e assista até o final para validar.",
  },
  {
    icon: Coins,
    title: "Acumule Saldo",
    description: "Cada vídeo assistido adiciona Kwanzas ao seu saldo.",
  },
  {
    icon: Wallet,
    title: "Saque seu Dinheiro",
    description: "Transfira para sua conta bancária ou carteira digital.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Como <span className="text-gradient">Funciona</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Ganhar dinheiro nunca foi tão simples. Siga estes 4 passos.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="glass rounded-2xl p-8 text-center hover:border-primary/50 transition-all duration-300 hover:scale-105 relative z-10">
                {/* Step Number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center glow-sm">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:glow-primary transition-all duration-300">
                  <step.icon className="h-10 w-10 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
