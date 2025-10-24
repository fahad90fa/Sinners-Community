import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4 rounded-3xl border border-border bg-card px-10 py-12 shadow-lg">
        <div className="inline-flex items-center justify-center rounded-full bg-primary/20 px-4 py-2 text-sm font-semibold text-primary">
          Lost in the void
        </div>
        <h1 className="text-5xl font-bold text-white">404</h1>
        <p className="text-lg text-muted-foreground">We couldn't find the page you're looking for.</p>
        <a href="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-transform hover:scale-105">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
