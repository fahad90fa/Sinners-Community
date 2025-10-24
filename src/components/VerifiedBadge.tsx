import { Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  isVerified: boolean;
  className?: string;
}

const VerifiedBadge = ({ isVerified, className = "" }: VerifiedBadgeProps) => {
  if (!isVerified) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center ${className}`}>
          <Check className="h-4 w-4 text-blue-500 bg-white rounded-full" />
        </div>
      </TooltipTrigger>
      <TooltipContent>Verified Account</TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
