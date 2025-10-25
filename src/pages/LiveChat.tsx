import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import ChatInput from "@/components/ChatInput";
import MessageRenderer from "@/components/MessageRenderer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getGroupChats } from "@/utils/groupChat";
import type { GroupChat } from "@/utils/groupChat";

type ConnectionState = "connecting" | "online" | "offline";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  recipientId: string | null;
  fileUrl?: string | null;
  fileType?: string;
}

interface ActiveUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  isSelf: boolean;
  isOnline: boolean;
}

interface PresencePayload {
  username: string;
  avatarUrl: string | null;
}

const LiveChat = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<ActiveUser | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [loadingGroupChats, setLoadingGroupChats] = useState(false);
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
    const loadGroupChats = async () => {
      if (!user) return;
      try {
        setLoadingGroupChats(true);
        const data = await getGroupChats(user.id);
        setGroupChats(data);
      } catch (error) {
        console.error("Error loading group chats:", error);
      } finally {
        setLoadingGroupChats(false);
      }
    };

    const loadAllUsers = async () => {
      if (!user) return;
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url");
        
        if (profiles) {
          const allUsers: ActiveUser[] = profiles
            .filter((p) => p.id !== user.id)
            .map((p) => ({
              id: p.id,
              username: p.username,
              avatarUrl: p.avatar_url as string | null,
              isSelf: false,
              isOnline: false,
            }));
          setActiveUsers(allUsers);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      void loadGroupChats();
      void loadAllUsers();
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
        next.delete((payload as Record<string, unknown>).userId as string);
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

    channel.on("presence", { event: "sync" }, async () => {
      const state = channel.presenceState<PresencePayload>();
      const onlineIds = new Set(Object.keys(state));

      setActiveUsers((prev) => {
        if (prev.length === 0) {
          return prev;
        }
        return prev.map((user) => ({
          ...user,
          isOnline: onlineIds.has(user.id),
        }));
      });
    });

    channel.on("presence", { event: "join" }, ({ key }) => {
      setActiveUsers((prev) =>
        prev.map((user) => (user.id === key ? { ...user, isOnline: true } : user))
      );
    });

    channel.on("presence", { event: "leave" }, ({ key }) => {
      setActiveUsers((prev) =>
        prev.map((user) => (user.id === key ? { ...user, isOnline: false } : user))
      );
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

  useEffect(() => {
    if (selectedRecipient && !selectedRecipient.isSelf) {
      void (async () => {
        if (!user) return;
        try {
          const conversationId = await getOrCreateConversation(selectedRecipient.id);
          if (!conversationId) return;

          const { data: messages } = await supabase
            .from("messages")
            .select("id, sender_id, content, created_at, metadata")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(50);

          if (messages) {
            const formattedMessages: ChatMessage[] = messages.map((msg) => {
              const metadata = (msg.metadata || {}) as Record<string, unknown>;
              return {
                id: msg.id,
                userId: msg.sender_id,
                username: (metadata.username as string) || "Unknown",
                content: msg.content,
                createdAt: msg.created_at,
                recipientId: msg.sender_id === user.id ? selectedRecipient.id : user.id,
                fileUrl: (metadata.fileUrl as string | null) || null,
                fileType: (metadata.fileType as string) || undefined,
              };
            });

            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error("Error loading chat history:", error);
        }
      })();
    } else {
      setMessages([]);
    }
  }, [selectedRecipient?.id, selectedRecipient?.isSelf, user?.id]);



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
      const isSentByMe = message.userId === user?.id;
      const isFromSelectedUser = message.userId === selectedRecipient.id;
      
      if (isSentByMe) {
        return message.recipientId === selectedRecipient.id || selectedRecipient.id === message.recipientId;
      }
      return isFromSelectedUser && (message.recipientId === user?.id || user?.id === message.recipientId);
    });
  }, [messages, selectedRecipient, user?.id]);

  const getOrCreateConversation = async (recipientId: string) => {
    if (!user) return null;

    try {
      const { data: existingConv } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      let conversationId: string | null = null;

      if (existingConv && existingConv.length > 0) {
        for (const item of existingConv) {
          const { data: members } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", item.conversation_id);

          const userIds = members?.map((m) => m.user_id) || [];
          if (userIds.includes(recipientId) && userIds.length === 2) {
            conversationId = item.conversation_id;
            break;
          }
        }
      }

      if (!conversationId) {
        console.log("Creating new conversation...");
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ is_group: false })
          .select("id")
          .single();

        if (convError) {
          console.error("Conversation creation error:", convError);
          return null;
        }

        if (newConv) {
          conversationId = newConv.id;

          const { error: membersError } = await supabase.from("conversation_members").insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: recipientId },
          ]);

          if (membersError) {
            console.error("Members creation error:", membersError);
            return null;
          }
        }
      }

      console.log("Conversation ID:", conversationId);
      return conversationId;
    } catch (error) {
      console.error("Error with conversation:", error);
      return null;
    }
  };

  const loadChatHistory = async (recipientId: string) => {
    if (!user) return;

    try {
      const conversationId = await getOrCreateConversation(recipientId);
      if (!conversationId) return;

      const { data: messages } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, metadata")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (messages) {
        const formattedMessages: ChatMessage[] = messages.map((msg) => {
          const metadata = (msg.metadata || {}) as Record<string, unknown>;
          return {
            id: msg.id,
            userId: msg.sender_id,
            username: (metadata.username as string) || "Unknown",
            content: msg.content,
            createdAt: msg.created_at,
            recipientId: msg.sender_id === user.id ? recipientId : user.id,
            fileUrl: (metadata.fileUrl as string | null) || null,
            fileType: (metadata.fileType as string) || undefined,
          };
        });

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const handleSendMessage = async (content: string, fileUrl?: string | null, fileType?: string) => {
    console.log("handleSendMessage called with:", { content, fileUrl, fileType, selectedRecipient });
    
    if (!content.trim() || !user) {
      console.log("Validation failed: empty content or no user");
      toast({
        title: "Error",
        description: "Cannot send empty message",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRecipient) {
      console.log("No recipient selected");
      toast({
        title: "Error",
        description: "Please select a user to message",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Getting/creating conversation...");
      const conversationId = await getOrCreateConversation(selectedRecipient.id);
      console.log("Conversation ID:", conversationId);
      
      if (!conversationId) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }

      const messageId = crypto.randomUUID();
      const metadata = {
        username: displayName,
        fileUrl,
        fileType,
      };

      console.log("Inserting message to DB...");
      const { error: dbError } = await supabase.from("messages").insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        metadata,
        type: fileType?.startsWith("image") ? "image" : fileType?.startsWith("video") ? "video" : fileType?.startsWith("audio") ? "audio" : "text",
      });

      if (dbError) {
        console.error("Database error:", dbError);
        toast({
          title: "Database Error",
          description: dbError.message,
          variant: "destructive",
        });
        return;
      }

      console.log("Message inserted successfully");

      const payload: ChatMessage = {
        id: messageId,
        userId: user.id,
        username: displayName,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        recipientId: selectedRecipient.id,
        fileUrl: fileUrl,
        fileType: fileType,
      };

      console.log("Updating local messages state...");
      setMessages((prev) => {
        const next = [...prev, payload];
        next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return next;
      });

      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });

      console.log("Broadcasting message via realtime...");
      await sendLiveChatMessage(payload);
      console.log("Message broadcast complete");
      
      toast({
        title: "Message sent",
        description: `Message sent to ${selectedRecipient.username}`,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    }
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
            <aside className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xl space-y-6 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between sticky top-0 bg-card/60 z-10">
                <div>
                  <h2 className="text-lg font-semibold text-white">Users</h2>
                  <p className="text-xs text-muted-foreground">
                    {activeUsers.filter((u) => !u.isSelf && u.isOnline).length} online • {activeUsers.filter((u) => !u.isSelf).length} total
                  </p>
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
                  activeUsers
                    .filter((u) => !u.isSelf)
                    .sort((a, b) => {
                      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                      return a.username.localeCompare(b.username);
                    })
                    .map((participant) => (
                      <button
                        key={`${participant.id}-${participant.username}`}
                        type="button"
                        onClick={() => {
                          setSelectedRecipient(participant);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-2 transition hover:border-primary/60 hover:bg-background/70 ${
                          selectedRecipient?.id === participant.id ? "border-primary/60" : ""
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-9 w-9 border border-border/60">
                            <AvatarImage src={participant.avatarUrl ?? undefined} />
                            <AvatarFallback>{participant.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background ${
                              participant.isOnline ? "bg-emerald-400" : "bg-gray-500"
                            }`}
                          />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-white">{participant.username}</span>
                          {selectedRecipient?.id === participant.id ? (
                            <span className="text-xs text-primary">Selected</span>
                          ) : participant.isOnline ? (
                            <span className="text-xs text-emerald-400">Online</span>
                          ) : (
                            <span className="text-xs text-gray-400">Offline</span>
                          )}
                        </div>
                      </button>
                    ))
                )}
              </div>

              {groupChats.length > 0 && (
                <>
                  <Separator className="bg-border/40" />
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Group Chats
                      </h3>
                      <p className="text-xs text-muted-foreground">Your group conversations</p>
                    </div>
                    <div className="space-y-2">
                      {groupChats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => navigate(`/messages?group=${chat.id}`)}
                          className="w-full flex items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3 py-2 transition hover:border-primary/60 hover:bg-background/70"
                        >
                          <Users className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex flex-col text-left min-w-0">
                            <span className="text-sm font-medium text-white truncate">{chat.name}</span>
                            <span className="text-xs text-muted-foreground">Group chat</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
                            <div className="mt-2 text-sm leading-relaxed break-words">
                              <MessageRenderer 
                                content={message.content}
                                fileUrl={message.fileUrl}
                                fileType={message.fileType}
                              />
                            </div>
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

              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={!selectedRecipient}
                placeholder={selectedRecipient ? `Message ${selectedRecipient.username}...` : "Select a user to chat"}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveChat;
