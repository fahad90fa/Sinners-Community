import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getPoll, votePoll, hasUserVoted } from "@/utils/polls";

interface PollComponentProps {
  pollId: string;
  userId: string;
}

interface Option {
  id: string;
  option_text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  question: string;
  options: Option[];
}

export default function PollComponent({ pollId, userId }: PollComponentProps) {
  const { toast } = useToast();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  const loadPoll = async () => {
    try {
      const pollData = await getPoll(pollId);
      setPoll(pollData);
      const voted = await hasUserVoted(pollId, userId);
      setHasVoted(voted);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load poll",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (hasVoted) {
      toast({
        title: "Already voted",
        description: "You have already voted on this poll",
      });
      return;
    }

    try {
      await votePoll(pollId, optionId, userId);
      setHasVoted(true);
      await loadPoll();
      toast({
        title: "Vote recorded",
        description: "Your vote has been counted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to vote",
        variant: "destructive",
      });
    }
  };

  if (loading || !poll) return null;

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.vote_count, 0);

  return (
    <div className="bg-muted p-4 rounded-lg space-y-3">
      <p className="font-semibold">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map(option => {
          const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted}
              className="w-full text-left"
            >
              <div className="relative overflow-hidden rounded bg-muted border">
                <div
                  className="bg-primary/30 h-8 flex items-center justify-between px-3 transition-all"
                  style={{ width: `${percentage}%` }}
                >
                  <span className="text-sm font-medium">{option.option_text}</span>
                </div>
                {percentage === 0 && (
                  <div className="h-8 flex items-center px-3">
                    <span className="text-sm">{option.option_text}</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">
                {option.vote_count} {option.vote_count === 1 ? "vote" : "votes"} ({percentage.toFixed(1)}%)
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Total votes: {totalVotes}</p>
    </div>
  );
}
