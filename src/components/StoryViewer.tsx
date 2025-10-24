import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Story {
  id: string;
  url: string;
  type: "image" | "video";
  caption?: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StoryViewer = ({ stories, initialIndex = 0, open, onOpenChange }: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  const currentStory = stories[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? stories.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === stories.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!currentStory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-black p-0 h-screen max-h-screen flex items-center justify-center">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {currentStory.type === "video" ? (
            <video
              src={currentStory.url}
              className="max-h-screen max-w-full object-contain"
              autoPlay
              controls
              controlsList="nodownload"
            />
          ) : (
            <img
              src={currentStory.url}
              alt="Story"
              className="max-h-screen max-w-full object-contain"
            />
          )}

          {stories.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {currentStory.caption && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg">
              <p className="text-sm">{currentStory.caption}</p>
            </div>
          )}

          {stories.length > 1 && (
            <div className="absolute bottom-4 right-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {currentIndex + 1} / {stories.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewer;
