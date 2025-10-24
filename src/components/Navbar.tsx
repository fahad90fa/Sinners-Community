import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search, PlusSquare, Heart, User, LogOut, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-gradient-to-b from-background/95 via-[hsl(355,80%,20%)]/90 to-background/95 backdrop-blur-lg text-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 text-white">
        <Link to={user ? "/feed" : "/"} className="flex items-center gap-2">
          <img
            src="/sinners.gif"
            alt="Sinners Community logo"
            className="h-10 w-10 rounded-full border border-primary object-cover"
            loading="lazy"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] bg-clip-text text-transparent">
            
          </span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-8">
            <Link to="/feed" className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors">
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link to="/explore" className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors">
              <Search className="h-5 w-5" />
              <span>Explore</span>
            </Link>
            <Link to="/create" className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors">
              <PlusSquare className="h-5 w-5" />
              <span>Create</span>
            </Link>
            <Link to="/notifications" className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors">
              <Heart className="h-5 w-5" />
              <span>Notifications</span>
            </Link>
            <Link to="/chat" className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors">
              <MessageCircle className="h-5 w-5" />
              <span>Live Chat</span>
            </Link>
            <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </Link>
          </div>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/profile" className="hidden md:block">
                <Avatar className="h-8 w-8 border-2 border-primary">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="text-white hover:text-primary">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button variant="gradient">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-around px-4 py-3">
          <Link to="/feed">
            <Home className="h-6 w-6 text-white hover:text-primary transition-colors" />
          </Link>
          <Link to="/explore">
            <Search className="h-6 w-6 text-white hover:text-primary transition-colors" />
          </Link>
          <Link to="/create">
            <PlusSquare className="h-6 w-6 text-white hover:text-primary transition-colors" />
          </Link>
          <Link to="/notifications">
            <Heart className="h-6 w-6 text-white hover:text-primary transition-colors" />
          </Link>
          <Link to="/chat">
            <MessageCircle className="h-6 w-6 text-white hover:text-primary transition-colors" />
          </Link>
          <Link to="/profile">
            <User className="h-6 w-6 text-white hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
