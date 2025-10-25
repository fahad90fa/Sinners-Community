import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Flame, UserPlus, UserCheck, Heart, MessageCircle, Share2, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ExplorePost {
  id: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  media: Array<{ url: string; type?: string }>;
  likes: Array<{ user_id: string }>;
  comments?: Array<any>;
  profiles?: {
    username: string;
    avatar_url: string | null;
    display_name?: string | null;
  };
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface UserWithFollowStatus extends UserProfile {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

const Explore = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [searchUsers, setSearchUsers] = useState<UserWithFollowStatus[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [followingStates, setFollowingStates] = useState<Map<string, boolean>>(new Map());
  const [selectedPost, setSelectedPost] = useState<ExplorePost | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const checkIfFollowing = useCallback(async (followerId: string, followeeId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", followerId)
        .eq("followee_id", followeeId);

      return !error && !!data && data.length > 0;
    } catch {
      return false;
    }
  }, []);

  const searchUsersFunction = useCallback(async (query: string) => {
    if (!user) return;
    try {
      setIsSearchingUsers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .ilike("username", `%${query}%`)
        .limit(20);

      if (error) throw error;

      if (data) {
        const usersWithStatus: UserWithFollowStatus[] = await Promise.all(
          data.map(async (profile) => {
            const [isFollowing, isFollowedBy] = await Promise.all([
              checkIfFollowing(user.id, profile.id),
              checkIfFollowing(profile.id, user.id),
            ]);

            return {
              ...profile,
              isFollowing,
              isFollowedBy,
            };
          })
        );

        setSearchUsers(usersWithStatus.filter((u) => u.id !== user.id));
      }
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setIsSearchingUsers(false);
    }
  }, [user, checkIfFollowing]);

  const fetchPosts = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          caption,
          created_at,
          user_id,
          media (
            url
          ),
          likes (
            user_id
          ),
          comments (id)
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map((post) => post.user_id)));
        const profilesMap = new Map<string, { username: string; avatar_url: string | null; display_name: string | null }>();

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, display_name")
            .in("id", userIds);

          if (!profilesError && profilesData) {
            profilesData.forEach((profile) => {
              profilesMap.set(profile.id, {
                username: profile.username,
                avatar_url: profile.avatar_url,
                display_name: profile.display_name,
              });
            });
          }
        }

        const postsWithProfiles = data.map((post) => ({
          ...post,
          profiles: profilesMap.get(post.user_id) ?? {
            username: "Unknown",
            avatar_url: null,
            display_name: null,
          },
        })) as ExplorePost[];

        setPosts(postsWithProfiles);

        if (user) {
          const likedPostIds = new Set(
            postsWithProfiles
              .filter((post) => post.likes?.some((like) => like.user_id === user.id))
              .map((post) => post.id)
          );
          setLikedPosts(likedPostIds);
        }
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Error loading explore posts", err);
      setPosts([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      void fetchPosts();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim()) {
      void searchUsersFunction(searchTerm.trim());
    } else {
      setSearchUsers([]);
    }
  }, [searchTerm, searchUsersFunction]);

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
        setSearchUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: false } : u))
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
        setSearchUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: true } : u))
        );

        toast({
          title: "Following",
          description: "You started following this user.",
        });
      }
    } catch (error) {
      console.error("Error toggling follow", error);
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    try {
      const isLiked = likedPosts.has(postId);

      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;

        setLikedPosts((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });

        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes: post.likes?.filter((like) => like.user_id !== user.id) || [],
                }
              : post
          )
        );
      } else {
        const { error } = await supabase.from("likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) throw error;

        setLikedPosts((prev) => new Set(prev).add(postId));

        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes: [...(post.likes || []), { user_id: user.id }],
                }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like", error);
      toast({
        title: "Error",
        description: "Failed to update like status.",
        variant: "destructive",
      });
    }
  };

  const getMediaPreview = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) {
      return 'video';
    }
    if (['gif'].includes(ext || '')) {
      return 'gif';
    }
    return 'image';
  };

  const filteredPosts = useMemo(() => {
    if (searchUsers.length > 0) {
      return [];
    }

    if (!searchTerm.trim()) {
      return posts;
    }

    const term = searchTerm.trim().toLowerCase();
    return posts.filter((post) => {
      const caption = post.caption?.toLowerCase() ?? "";
      const username = post.profiles?.username.toLowerCase() ?? "";
      return caption.includes(term) || username.includes(term);
    });
  }, [posts, searchTerm, searchUsers]);

  const trendingPosts = useMemo(() => {
    const withScores = posts.map((post) => ({
      post,
      score:
        (post.likes?.length ?? 0) * 2 +
        Math.max(0, 48 - Math.floor((Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60))),
    }));

    return withScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.post);
  }, [posts]);

  if (loading || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase text-primary">
                <Flame className="h-4 w-4" />
                Discover
              </div>
              <h1 className="text-3xl font-bold">Explore top moments from the community</h1>
              <p className="text-muted-foreground">
                Search new creators, trending posts, and curated highlights tailored for you.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by caption or username"
                className="pl-10"
              />
            </div>
          </div>

          {searchUsers.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Users</h2>
                <Badge variant="secondary">{searchUsers.length} result{searchUsers.length !== 1 ? "s" : ""}</Badge>
              </div>
              {isSearchingUsers ? (
                <div className="flex justify-center py-8">
                  <img src="/sinners.gif" alt="Loading users" className="h-12 w-12 rounded-full border border-primary object-cover" />
                </div>
              ) : (
                <div className="space-y-3">
                  {searchUsers.map((searchUser) => (
                    <div key={searchUser.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                      <button
                        onClick={() => navigate(`/user/${searchUser.id}`)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={searchUser.avatar_url || ""} />
                          <AvatarFallback>{searchUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{searchUser.display_name || searchUser.username}</div>
                          <div className="text-sm text-muted-foreground truncate">@{searchUser.username}</div>
                          {searchUser.bio && <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{searchUser.bio}</div>}
                          {searchUser.isFollowedBy && (
                            <Badge variant="outline" className="text-xs mt-1">Follows you</Badge>
                          )}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant={searchUser.isFollowing ? "outline" : "default"}
                        onClick={() => toggleFollow(searchUser.id)}
                        className="flex-shrink-0"
                      >
                        {searchUser.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {trendingPosts.length > 0 && searchUsers.length === 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Trending today</h2>
                <Badge variant="outline">Updated hourly</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {trendingPosts.map((post) => {
                  const mediaUrl = post.media?.[0]?.url ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=600&fit=crop";
                  const mediaType = getMediaPreview(mediaUrl);

                  return (
                    <button
                      key={`trending-${post.id}`}
                      onClick={() => setSelectedPost(post)}
                      className="group relative overflow-hidden rounded-2xl bg-muted aspect-square cursor-pointer"
                    >
                      {mediaType === 'video' ? (
                        <>
                          <video
                            src={mediaUrl}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                              <div className="w-0 h-0 border-l-5 border-r-0 border-t-3 border-b-3 border-l-white border-t-transparent border-b-transparent ml-1" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={mediaUrl}
                          alt={post.caption ?? "Post"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="pointer-events-none absolute bottom-4 left-4 right-4 translate-y-4 space-y-1 text-sm text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <div className="font-semibold">{post.profiles?.username ?? "Unknown"}</div>
                        {post.caption && <div className="line-clamp-2 text-xs text-white/80">{post.caption}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Latest from the community</h2>
              <Badge variant="secondary">{filteredPosts.length} posts</Badge>
            </div>
            {isFetching ? (
              <div className="flex justify-center py-16">
                <img src="/sinners.gif" alt="Loading explore posts" className="h-16 w-16 rounded-full border border-primary object-cover" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border py-16 text-center">
                <h3 className="text-lg font-semibold">No posts found</h3>
                <p className="text-muted-foreground">Try adjusting your search or check back later for new content.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {filteredPosts.map((post) => {
                  const mediaUrl = post.media?.[0]?.url ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=600&fit=crop";
                  const mediaType = getMediaPreview(mediaUrl);

                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer"
                    >
                      {mediaType === 'video' ? (
                        <>
                          <video
                            src={mediaUrl}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                              <div className="w-0 h-0 border-l-6 border-r-0 border-t-4 border-b-4 border-l-white border-t-transparent border-b-transparent ml-1" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={mediaUrl}
                          alt={post.caption ?? "Post"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/60 via-black/0 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="text-xs font-semibold uppercase text-white/80">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm font-medium text-white">{post.profiles?.username ?? "Unknown"}</div>
                        {post.caption && (
                          <div className="line-clamp-2 text-xs text-white/70">{post.caption}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-6xl max-h-[90vh] flex bg-card rounded-2xl overflow-hidden">
              {/* Media Section */}
              <div className="flex-1 flex items-center justify-center bg-black min-w-0">
                {selectedPost.media?.[0]?.url ? (
                  getMediaPreview(selectedPost.media[0].url) === 'video' ? (
                    <video
                      src={selectedPost.media[0].url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedPost.media[0].url}
                      alt={selectedPost.caption ?? "Post"}
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=800&fit=crop"
                    alt="Placeholder"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Info Section */}
              <div className="w-full md:w-96 flex flex-col bg-card border-l border-border">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={selectedPost.profiles?.avatar_url || ""} />
                      <AvatarFallback>{selectedPost.profiles?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{selectedPost.profiles?.display_name || selectedPost.profiles?.username}</div>
                      <div className="text-xs text-muted-foreground">@{selectedPost.profiles?.username}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPost(null)}
                    className="flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Caption */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedPost.caption && (
                    <div className="text-sm">{selectedPost.caption}</div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{selectedPost.likes?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">Likes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{selectedPost.comments?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">Comments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">0</div>
                      <div className="text-xs text-muted-foreground">Shares</div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-muted-foreground pt-4 border-t border-border">
                    Posted {new Date(selectedPost.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border p-4 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(selectedPost.id)}
                    className={likedPosts.has(selectedPost.id) ? "text-red-500" : ""}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${likedPosts.has(selectedPost.id) ? "fill-current" : ""}`} />
                    Like
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Comment
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
