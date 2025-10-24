import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ConnectionState = "connecting" | "online" | "offline";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  recipientId: string | null;
}

interface ActiveUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  isSelf: boolean;
}

interface PresencePayload {
  username: string;
  avatarUrl: string | null;
}

const LiveChat = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<ActiveUser | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const displayName = useMemo(() => {
    if (!user) {
      return "Guest";
    }

    return (
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Guest"
    );
  }, [user]);

  const avatarUrl = useMemo(() => {
    if (!user) {
      return null;
    }

    return (user.user_metadata?.avatar_url as string | null) ?? null;
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setConnectionState("connecting");
    const channel = supabase.channel("live-chat", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const incoming = { ...(payload as ChatMessage), recipientId: (payload as ChatMessage).recipientId ?? null };
      setMessages((prev) => {
        if (prev.some((item) => item.id === incoming.id)) {
          return prev;
        }

        const next = [...prev, incoming];
        next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return next;
      });
      
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete((payload as any).userId);
        return next;
      });
    });

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const { userId } = payload as { userId: string };
      setTypingUsers((prev) => new Set(prev).add(userId));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }, 3000);
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresencePayload>();
      const participants: ActiveUser[] = Object.entries(state).flatMap(([id, presences]) =>
        presences.map((presence) => ({
          id,
          username: presence.username,
          avatarUrl: presence.avatarUrl ?? null,
          isSelf: id === user.id,
        })),
      );
      participants.sort((a, b) => a.username.localeCompare(b.username));
      setActiveUsers(participants);
      setSelectedRecipient((current) => {
        if (!current) {
          return null;
        }
        const match = participants.find((participant) => participant.id === current.id);
        return match ?? null;
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnectionState("online");
        void channel.track({
          username: displayName,
          avatarUrl,
        });
      }
      if (status === "CLOSED" || status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setConnectionState("offline");
      }
    });

    channelRef.current = channel;

    return () => {
      setConnectionState("offline");
      channel.unsubscribe();
      channelRef.current = null;
      setActiveUsers([]);
      setSelectedRecipient(null);
    };
  }, [user, displayName, avatarUrl]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendLiveChatMessage = async (message: ChatMessage) => {
    if (!channelRef.current) {
      return;
    }

    await channelRef.current.send({
      type: "broadcast",
      event: "message",
      payload: message,
    });
  };

  const filteredMessages = useMemo(() => {
    if (!selectedRecipient) {
      return messages;
    }

    return messages.filter((message) => {
      if (message.userId === user?.id) {
        return message.recipientId === selectedRecipient.id;
      }
      return message.userId === selectedRecipient.id && message.recipientId === user?.id;
    });
  }, [messages, selectedRecipient, user?.id]);

  const handleTyping = async (text: string) => {
    setMessageInput(text);

    if (!user || !channelRef.current) {
      return;
    }

    try {
      await channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: user.id,
        },
      });
    } catch (error) {
      console.error("Error sending typing indicator:", error);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!messageInput.trim() || !user) {
      return;
    }

    if (!selectedRecipient) {
      return;
    }

    const payload: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: displayName,
      content: messageInput.trim(),
      createdAt: new Date().toISOString(),
      recipientId: selectedRecipient.id,
    };

    setMessages((prev) => {
      const next = [...prev, payload];
      next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return next;
    });
    setMessageInput("");
    setTypingUsers((prev) => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
    await sendLiveChatMessage(payload);
  };

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const statusTone =
    connectionState === "online"
      ? "text-emerald-400"
      : connectionState === "connecting"
        ? "text-amber-400"
        : "text-red-400";

  const statusIndicator =
    connectionState === "online"
      ? "bg-emerald-400"
      : connectionState === "connecting"
        ? "bg-amber-400"
        : "bg-red-500";

  const statusLabel =
    connectionState === "online" ? "Live" : connectionState === "connecting" ? "Connecting..." : "Offline";

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
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Live Chat</h1>
            <p className="text-muted-foreground">Connect with the community in real time.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Active Users</h2>
                  <p className="text-xs text-muted-foreground">Currently in the conversation</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/group-chats")}
                    title="Group Chats"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                  <span className={`h-2.5 w-2.5 rounded-full ${statusIndicator}`} />
                  <span className={`text-sm ${statusTone}`}>{statusLabel}</span>
                </div>
              </div>
              <div className="space-y-3">
                {activeUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No one is online right now.</div>
                ) : (
                  activeUsers.map((participant) => (
                    <button
                      key={`${participant.id}-${participant.username}`}
                      type="button"
                      onClick={() => {
                        if (!participant.isSelf) {
                          setSelectedRecipient(participant);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-2 transition hover:border-primary/60 hover:bg-background/70 ${
                        selectedRecipient?.id === participant.id ? "border-primary/60" : ""
                      } ${participant.isSelf ? "opacity-60" : ""}`}
                      disabled={participant.isSelf}
                    >
                      <Avatar className="h-9 w-9 border border-border/60">
                        <AvatarImage src={participant.avatarUrl ?? undefined} />
                        <AvatarFallback>{participant.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium text-white">{participant.username}</span>
                        {participant.isSelf ? (
                          <span className="text-xs text-primary">You</span>
                        ) : selectedRecipient?.id === participant.id ? (
                          <span className="text-xs text-primary">Selected</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Tap to chat</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>
            <section className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {selectedRecipient ? `Chat with ${selectedRecipient.username}` : "Select a user"}
                </h2>
                <span className="text-sm text-muted-foreground">{filteredMessages.length} messages</span>
              </div>
              <div className="h-[460px] overflow-y-auto space-y-4 pr-2">
                {filteredMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    {selectedRecipient ? "No messages yet. Say hello." : "Choose someone to start chatting."}
                  </div>
                ) : (
                  <>
                    {filteredMessages.map((message) => {
                      const isOwn = message.userId === user.id;

                      return (
                        <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 border ${
                              isOwn
                                ? "bg-gradient-to-r from-primary via-primary-glow to-[hsl(355,80%,50%)] text-white border-primary/60"
                                : "bg-background text-white border-border/70"
                            }`}
                          >
                            <div className="text-xs uppercase tracking-wide text-white/70">{message.username}</div>
                            <div className="mt-2 text-sm leading-relaxed break-words">{message.content}</div>
                            <div className="mt-2 text-[10px] uppercase tracking-wide text-white/50">
                              {formatTimestamp(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {selectedRecipient && typingUsers.has(selectedRecipient.id) && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl px-4 py-3 border bg-background text-white border-border/70">
                          <div className="text-xs uppercase tracking-wide text-white/70">{selectedRecipient.username}</div>
                          <div className="mt-2 text-sm text-muted-foreground">typing...</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  placeholder={selectedRecipient ? "Type your message..." : "Select a user first"}
                  className="bg-background/80 text-white"
                  disabled={!selectedRecipient}
                />
                <Button
                  type="submit"
                  variant="gradient"
                  className="min-w-[120px]"
                  disabled={!messageInput.trim() || !selectedRecipient}
                >
                  Send
                </Button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveChat;
