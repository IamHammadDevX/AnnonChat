import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MessageCircle, Shield, Zap, Users, Lock, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">AnonChat</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="link-admin">
                Admin
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:via-background dark:to-primary/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/30 rounded-full blur-3xl opacity-20" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-foreground/80">
              100% Anonymous. No Signup Required.
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Chat with{" "}
            <span className="text-primary">Strangers</span>
            {" "}Anonymously
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect instantly with random people from around the world. 
            No registration, no profiles, just pure anonymous conversations.
          </p>
          
          <Link href="/chat">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg rounded-xl font-semibold gap-2 group"
              data-testid="button-start-chat"
            >
              Start Chatting
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span>End-to-End Privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Instant Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Secure & Safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose AnonChat?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Experience the freedom of anonymous conversations with powerful features designed for your privacy.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Complete Anonymity"
              description="No registration, no profiles, no tracking. Your identity stays completely private throughout your conversations."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Instant Matching"
              description="Get connected with a random stranger in under 2 seconds. No waiting, no hassle - just instant conversations."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Global Community"
              description="Meet people from all around the world. Every conversation is a new adventure with someone unique."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Getting started is as easy as 1, 2, 3
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            <StepCard
              number={1}
              title="Click Start"
              description="Hit the 'Start Chatting' button - no signup or registration needed."
            />
            <StepCard
              number={2}
              title="Get Matched"
              description="Our system instantly pairs you with a random stranger who's also looking to chat."
            />
            <StepCard
              number={3}
              title="Start Talking"
              description="Begin your anonymous conversation. Disconnect anytime and find a new partner."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Meet Someone New?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of users who are having anonymous conversations right now. 
            No signup required - just click and chat!
          </p>
          <Link href="/chat">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg rounded-xl font-semibold gap-2"
              data-testid="button-start-chat-cta"
            >
              <MessageCircle className="w-5 h-5" />
              Start Chatting Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>AnonChat</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Privacy First. Always Anonymous.</span>
            <Link href="/admin">
              <span className="hover:text-foreground transition-colors cursor-pointer">
                Admin Login
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="p-8 rounded-xl bg-card border border-card-border hover-elevate transition-all">
      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ 
  number, 
  title, 
  description 
}: { 
  number: number; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="relative p-8 text-center">
      {/* Connector line for desktop */}
      {number < 3 && (
        <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
      )}
      
      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
