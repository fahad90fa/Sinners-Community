import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark } from "lucide-react";

interface Post {
  id: string;
  caption: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  media: Array<{
    url: string;
    type: string;
  }>;
  likes: Array<{ id: string; user_id: string }>;
  comments: Array<{ id: string }>;
}

const Saved = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSavedPosts();
    }
  }, [user]);

  const fetchSavedPosts = async () => {
    try {
      setLoadingPosts(true);

      const { data: savedPostIds, error: savedError } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;

      if (!savedPostIds || savedPostIds.length === 0) {
        setPosts([]);
        return;
      }

      const postIds = savedPostIds.map(sp => sp.post_id);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          created_at,
          user_id,
          media (
            url,
            type
          ),
          likes (
            id,
            user_id
          ),
          comments (
            id
          )
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(post => post.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

        const postsWithProfiles = data.map(post => ({
          ...post,
          profiles: profilesMap.get(post.user_id) || { username: 'Unknown', avatar_url: null }
        }));

        setPosts(postsWithProfiles as any);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== deletedId));
  };

  const handlePostUnsaved = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

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
        <div className="max-w-[630px] mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <Bookmark className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Saved</h1>
              <p className="text-muted-foreground">Your bookmarked posts</p>
            </div>
          </div>

          {loadingPosts ? (
            <div className="text-center py-12">
              <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
              <p className="mt-4 text-muted-foreground">Loading saved posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No saved posts yet</h2>
              <p className="text-muted-foreground">Save posts to view them here later.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex justify-center">
                <PostCard
                  postId={post.id}
                  username={post.profiles?.username || 'Unknown'}
                  userAvatar={post.profiles?.avatar_url}
                  imageUrl={post.media[0]?.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop'}
                  caption={post.caption || ''}
                  initialLikes={post.likes?.length || 0}
                  commentsCount={post.comments?.length || 0}
                  timeAgo={getTimeAgo(post.created_at)}
                  createdAt={post.created_at}
                  initialLiked={!!post.likes?.some((like) => like.user_id === user?.id)}
                  isOwner={post.user_id === user.id}
                  onPostDeleted={handlePostDeleted}
                  mediaType={post.media[0]?.type as "image" | "video" | undefined}
                />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Saved;
