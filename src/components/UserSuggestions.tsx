import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserSuggestions, type UserSuggestion } from "@/utils/userSuggestions";
import { UserPlus, UserCheck } from "lucide-react";

const UserSuggestions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<Map<string, boolean>>(new Map());

  const loadSuggestions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userSuggestions = await getUserSuggestions(user.id, 4);
      setSuggestions(userSuggestions);

      const followingMap = new Map<string, boolean>();
      userSuggestions.forEach((suggestion) => {
        followingMap.set(suggestion.id, suggestion.isFollowing);
      });
      setFollowingStates(followingMap);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadSuggestions();
    }
  }, [user, loadSuggestions]);

  const toggleFollow = async (userId: string) => {
    if (!user) return;

    try {
      const isCurrentlyFollowing = followingStates.get(userId) || false;

      if (isCurrentlyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("followee_id", userId);

        if (error) throw error;

        setFollowingStates((prev) => new Map(prev).set(userId, false));
        setSuggestions((prev) =>
          prev.map((s) => (s.id === userId ? { ...s, isFollowing: false } : s))
        );

        toast({
          title: "Unfollowed",
          description: "You unfollowed this user.",
        });
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          followee_id: userId,
        });

        if (error) throw error;

        setFollowingStates((prev) => new Map(prev).set(userId, true));
        setSuggestions((prev) =>
          prev.map((s) => (s.id === userId ? { ...s, isFollowing: true } : s))
        );

        toast({
          title: "Following",
          description: "You started following this user.",
        });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    }
  };

  if (loading || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">Suggested for you</h2>
      </div>
      <div className="divide-y divide-border">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
            <button
              onClick={() => navigate(`/user/${suggestion.id}`)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={suggestion.avatar_url || ""} />
                <AvatarFallback>{suggestion.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">
                  {suggestion.display_name || suggestion.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">@{suggestion.username}</div>
                {suggestion.mutualFollowersCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {suggestion.mutualFollowersCount} mutual followers
                  </div>
                )}
              </div>
            </button>
            <Button
              size="sm"
              variant={suggestion.isFollowing ? "outline" : "default"}
              onClick={() => toggleFollow(suggestion.id)}
              className="flex-shrink-0"
            >
              {suggestion.isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Follow</span>
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default UserSuggestions;
