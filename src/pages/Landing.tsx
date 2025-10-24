import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Heart, MessageCircle, Users, Zap } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[hsl(355,80%,18%)] to-secondary text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg text-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img
              src="/sinners.gif"
              alt="Sinners Community logo"
              className="h-10 w-10 rounded-full border border-primary object-cover"
              loading="lazy"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] bg-clip-text text-transparent">
              Sinners Community
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button variant="gradient">Sign up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-white">
              Share Your
              <span className="bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] bg-clip-text text-transparent">
                {" "}Moments{" "}
              </span>
              With The World
            </h1>
            <p className="text-lg text-muted-foreground">
              Connect with friends and family. Share photos, videos, and stories. Discover amazing content from creators worldwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup">
                <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Log In
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary-glow/25 to-[hsl(355,80%,50%)]/25 blur-3xl" />
            <video 
              src="/lv_0_20240809193451.mov" 
              autoPlay
              muted
              loop
              playsInline
              className="relative rounded-3xl shadow-2xl w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Choose Sinners Community?</h2>
          <p className="text-lg text-muted-foreground">Everything you need to share and connect</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Share Photos & Videos</h3>
            <p className="text-muted-foreground">Post unlimited photos and videos to your feed</p>
          </div>
          <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Like & Comment</h3>
            <p className="text-muted-foreground">Engage with content you love</p>
          </div>
          <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Follow Friends</h3>
            <p className="text-muted-foreground">Stay connected with people you care about</p>
          </div>
          <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Real-time Updates</h3>
            <p className="text-muted-foreground">Get instant notifications on activity</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Sharing?</h2>
          <p className="text-xl mb-8 opacity-90">Join millions of users already on Sinners Community</p>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Sinners Community. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
