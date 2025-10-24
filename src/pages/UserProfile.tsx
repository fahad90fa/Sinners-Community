import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Grid3x3, Play, UserPlus, UserCheck } from "lucide-react";

interface UserProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean | null;
}

interface Post {
  id: string;
  caption: string | null;
  created_at: string;
  media: Array<{
    url: string;
    type: string;
  }>;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [isToggleFollowLoading, setIsToggleFollowLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (userId && user) {
      void fetchUserProfileData();
    }
  }, [userId, user]);

  const fetchUserProfileData = async () => {
    if (!userId || !user) return;

    try {
      setLoadingData(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError || !profileData) {
        throw new Error("User not found");
      }

      setUserProfile(profileData);

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          id,
          caption,
          created_at,
          media (
            url,
            type
          )
        `
        )
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const postsOnly: Post[] = [];
      const reelsList: Post[] = [];

      (postsData || []).forEach((post: any) => {
        if (post.media && post.media[0]) {
          const mediaType = post.media[0]?.type;
          if (mediaType === "video") {
            reelsList.push(post);
          } else {
            postsOnly.push(post);
          }
        } else {
          postsOnly.push(post);
        }
      });

      setPosts(postsOnly);
      setReels(reelsList);

      const { count: followersCount, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", userId);

      if (!followersError && followersCount !== null) {
        setFollowers(followersCount);
      }

      const { count: followingCount, error: followingError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      if (!followingError && followingCount !== null) {
        setFollowing(followingCount);
      }

      const { data: isFollowingData, error: isFollowingError } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("followee_id", userId)
        .single();

      setIsFollowing(!isFollowingError && !!isFollowingData);

      const { data: isFollowedByData, error: isFollowedByError } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("followee_id", user.id)
        .single();

      setIsFollowedBy(!isFollowedByError && !!isFollowedByData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "User not found",
        description: "This user profile could not be loaded.",
        variant: "destructive",
      });
      navigate("/explore");
    } finally {
      setLoadingData(false);
    }
  };

  const toggleFollow = async () => {
    if (!user || !userId) return;

    try {
      setIsToggleFollowLoading(true);

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("followee_id", userId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowers((prev) => Math.max(0, prev - 1));
        toast({
          title: "Unfollowed",
          description: `You unfollowed ${userProfile?.username}`,
        });
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          followee_id: userId,
        });

        if (error) throw error;

        setIsFollowing(true);
        setFollowers((prev) => prev + 1);
        toast({
          title: "Following",
          description: `You followed ${userProfile?.username}`,
        });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    } finally {
      setIsToggleFollowLoading(false);
    }
  };

  if (loading || loadingData || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img
            src="/sinners.gif"
            alt="Loading"
            className="mx-auto h-16 w-16 rounded-full border border-primary object-cover"
          />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <h1 className="text-2xl font-bold">User not found</h1>
            <Button onClick={() => navigate("/explore")} className="mt-4">
              Back to Explore
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 flex flex-col items-center gap-6 md:flex-row md:items-start">
          <Avatar className="h-32 w-32 md:h-40 md:w-40">
            <AvatarImage src={userProfile.avatar_url || ""} />
            <AvatarFallback>{userProfile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-3xl font-bold">{userProfile.display_name || userProfile.username}</h1>
              <p className="text-muted-foreground">@{userProfile.username}</p>
            </div>

            {userProfile.bio && <p className="text-sm text-muted-foreground">{userProfile.bio}</p>}

            <div className="flex gap-4 justify-center md:justify-start">
              <div className="text-center">
                <div className="text-2xl font-bold">{posts.length + reels.length}</div>
                <div className="text-sm text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{followers}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{following}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
            </div>

            <div className="flex gap-2 justify-center md:justify-start">
              <Button
                variant={isFollowing ? "outline" : "default"}
                onClick={toggleFollow}
                disabled={isToggleFollowLoading}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              {isFollowedBy && <Badge variant="outline">Follows you</Badge>}
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Posts</h2>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-16 text-center">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={post.media[0]?.url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop"}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {reels.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Reels</h2>
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-4">
                {reels.map((reel) => (
                  <div
                    key={reel.id}
                    className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                  >
                    <video
                      src={reel.media[0]?.url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <Play className="h-8 w-8 text-white" fill="white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
