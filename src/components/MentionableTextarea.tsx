import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentionableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

interface UserSuggestion {
  id: string;
  username: string;
  avatar_url: string | null;
}

const MentionableTextarea = ({
  value,
  onChange,
  placeholder = "Write something...",
  disabled = false,
  maxLength = 500,
  className = "",
}: MentionableTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  useEffect(() => {
    const lastAtSign = value.lastIndexOf("@");
    if (lastAtSign === -1) {
      setShowSuggestions(false);
      return;
    }

    const afterAt = value.substring(lastAtSign + 1);
    if (afterAt.includes(" ") || afterAt.includes("\n")) {
      setShowSuggestions(false);
      return;
    }

    if (afterAt.length < 1) {
      setShowSuggestions(false);
      return;
    }

    searchUsers(afterAt);
    setMentionPosition(lastAtSign);
  }, [value]);

  const searchUsers = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `${query}%`)
        .limit(5);

      if (error) throw error;

      if (data && data.length > 0) {
        setSuggestions(data);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSuggestions([]);
    }
  };

  const insertMention = (username: string) => {
    const lastAtSign = value.lastIndexOf("@");
    if (lastAtSign === -1) return;

    const beforeMention = value.substring(0, lastAtSign);
    const afterAt = value.substring(lastAtSign + 1);
    const spaceIndex = afterAt.search(/[\s]/);
    
    let afterMention = "";
    if (spaceIndex !== -1) {
      afterMention = afterAt.substring(spaceIndex);
    }
    
    const newValue = `${beforeMention}@${username}${afterMention}`;
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertMention(suggestions[selectedSuggestionIndex].username);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onKeyDown={handleKeyDown}
        className={className}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute bottom-full left-0 right-0 mb-2 max-h-48 overflow-y-auto z-50">
          <div className="divide-y divide-border">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => insertMention(suggestion.username)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  index === selectedSuggestionIndex
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={suggestion.avatar_url || ""} />
                  <AvatarFallback>{suggestion.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">@{suggestion.username}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MentionableTextarea;
