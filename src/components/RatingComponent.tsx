import { useCallback, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ratePost, getPostRating, addEmojiReaction } from "@/utils/ratings";

interface RatingComponentProps {
  postId: string;
  userId: string;
}

const emojis = ["😍", "🔥", "😢", "😂", "🤔"];

export default function RatingComponent({ postId, userId }: RatingComponentProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRate = useCallback(async (rate: number) => {
    setLoading(true);
    try {
      await ratePost(userId, postId, rate);
      setRating(rate);
      toast({
        title: "Rated",
        description: `You rated this post ${rate} star${rate !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rate post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, postId, toast]);

  const handleEmojiReaction = useCallback(async (emoji: string) => {
    setLoading(true);
    try {
      await addEmojiReaction(userId, postId, emoji);
      setSelectedEmoji(selectedEmoji === emoji ? null : emoji);
      toast({
        title: "Reaction added",
        description: `You reacted with ${emoji}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, postId, selectedEmoji, toast]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(rate => (
          <button
            key={rate}
            onClick={() => handleRate(rate)}
            disabled={loading}
            className={`p-1 transition-colors ${
              rating >= rate ? 'text-yellow-500' : 'text-gray-300'
            }`}
          >
            <Star className="h-4 w-4 fill-current" />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {emojis.map(emoji => (
          <Button
            key={emoji}
            variant={selectedEmoji === emoji ? "default" : "outline"}
            size="sm"
            onClick={() => handleEmojiReaction(emoji)}
            disabled={loading}
            className="text-base"
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
}
