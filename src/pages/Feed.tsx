import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

const Feed = () => {
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
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
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
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch profiles separately
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
        
        setPosts(postsWithProfiles as Post[]);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Feed</h1>
            <p className="text-muted-foreground">See what your friends are sharing</p>
          </div>
          
          {loadingPosts ? (
            <div className="text-center py-12">
              <img src="/sinners.gif" alt="Loading posts" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
              <p className="mt-4 text-muted-foreground">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Start following people or create your first post!</p>
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

export default Feed;
