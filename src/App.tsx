import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import UserProfile from "./pages/UserProfile";
import Create from "./pages/Create";
import Notifications from "./pages/Notifications";
import LiveChat from "./pages/LiveChat";
import AdminDashboard from "./pages/AdminDashboard";
import Saved from "./pages/Saved";
import HashtagExplore from "./pages/HashtagExplore";
import Drafts from "./pages/Drafts";
import GroupChats from "./pages/GroupChats";
import GroupChatMessages from "./pages/GroupChatMessages";
import CreatorDashboard from "./pages/CreatorDashboard";
import NotFound from "./pages/NotFound";
import { SpeedInsights } from "@vercel/speed-insights/react"
const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    setIsTransitioning(true);

    const timeout = setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [location]);

  return (
    <>
      {isTransitioning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95">
          <img src="/sinners.gif" alt="Loading" className="h-24 w-24 rounded-full border border-primary object-cover" />
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/explore/hashtag/:hashtag" element={<HashtagExplore />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/create" element={<Create />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/chat" element={<LiveChat />} />
        <Route path="/messages" element={<GroupChatMessages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/drafts" element={<Drafts />} />
        <Route path="/group-chats" element={<GroupChats />} />
        <Route path="/creator-dashboard" element={<CreatorDashboard />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
