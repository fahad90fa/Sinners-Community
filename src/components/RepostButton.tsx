import { useCallback, useState } from "react";
import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { repostPost, removeRepost, isPostReposted, getRepostCount } from "@/utils/reposts";

interface RepostButtonProps {
  postId: string;
  userId: string;
}

export default function RepostButton({ postId, userId }: RepostButtonProps) {
  const { toast } = useToast();
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkRepostStatus = useCallback(async () => {
    const reposted = await isPostReposted(userId, postId);
    const count = await getRepostCount(postId);
    setIsReposted(reposted);
    setRepostCount(count);
  }, [userId, postId]);

  const handleRepost = useCallback(async () => {
    setLoading(true);
    try {
      if (isReposted) {
        await removeRepost(userId, postId);
        setIsReposted(false);
        setRepostCount(Math.max(0, repostCount - 1));
        toast({
          title: "Repost removed",
          description: "Post has been removed from your reposts.",
        });
      } else {
        await repostPost(userId, postId);
        setIsReposted(true);
        setRepostCount(repostCount + 1);
        toast({
          title: "Reposted!",
          description: "Post shared with your followers.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to repost",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isReposted, userId, postId, repostCount, toast]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRepost}
      disabled={loading}
      className={isReposted ? "text-green-600" : ""}
    >
      <Repeat2 className="h-4 w-4 mr-1" />
      <span className="text-xs">{repostCount}</span>
    </Button>
  );
}
