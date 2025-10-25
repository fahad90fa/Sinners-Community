import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import ChatInput from "@/components/ChatInput";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface GroupMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface GroupChatData {
  id: string;
  name: string;
  members: GroupMember[];
}

const GroupChatMessages = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  
  const [groupChat, setGroupChat] = useState<GroupChatData | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!groupId) {
      navigate("/group-chats");
      return;
    }

    const loadGroupData = async () => {
      if (!user) return;
      try {
        setLoadingData(true);

        const { data: chatData, error: chatError } = await supabase
          .from("group_chats")
          .select("id, name")
          .eq("id", groupId)
          .single();

        if (chatError) throw chatError;

        const { data: membersData, error: membersError } = await supabase
          .from("group_chat_members")
          .select("user_id")
          .eq("group_chat_id", groupId);

        if (membersError) throw membersError;

        const userIds = membersData?.map((m) => m.user_id) || [];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        setGroupChat({
          id: chatData.id,
          name: chatData.name,
          members: profilesData || [],
        });

        const { data: messagesData, error: messagesError } = await supabase
          .from("group_messages")
          .select("id, user_id, content, created_at")
          .eq("group_chat_id", groupId)
          .order("created_at", { ascending: true })
          .limit(50);

        if (messagesError) throw messagesError;

        const senderIds = Array.from(new Set((messagesData || []).map((m) => m.user_id)));
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", senderIds);

        const profileMap = new Map(senderProfiles?.map((p) => [p.id, p]));

        const formattedMessages: GroupMessage[] = (messagesData || []).map((msg) => {
          const profile = profileMap.get(msg.user_id);
          return {
            id: msg.id,
            sender_id: msg.user_id,
            sender_name: profile?.username || "Unknown",
            sender_avatar: profile?.avatar_url || null,
            content: msg.content,
            created_at: msg.created_at,
          };
        });

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error loading group data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    void loadGroupData();
  }, [groupId, user, navigate]);

  useEffect(() => {
    if (!groupId || !user) return;

    const channel = supabase.channel(`group-chat-${groupId}`, {
      config: { presence: { key: user.id } },
    });

    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const newMessage = payload as GroupMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Subscribed to group chat channel");
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [groupId, user]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (content: string, fileUrl?: string | null, fileType?: string) => {
    if (!content.trim() || !user || !groupId || sendingMessage) return;

    setSendingMessage(true);
    try {
      const messageId = crypto.randomUUID();
      
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      const senderName = profileData?.username || user.user_metadata?.username || user.email || "Unknown";
      const senderAvatar = profileData?.avatar_url || null;

      let messageContent = content;
      if (fileUrl && fileType?.startsWith("voice")) {
        messageContent = "[Voice Message]";
      } else if (fileUrl) {
        messageContent = content;
      }

      const newMessage: GroupMessage = {
        id: messageId,
        sender_id: user.id,
        sender_name: senderName,
        sender_avatar: senderAvatar,
        content: messageContent,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("group_messages")
        .insert({
          id: messageId,
          group_chat_id: groupId,
          user_id: user.id,
          content: messageContent,
        });

      if (error) throw error;

      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "message",
          payload: newMessage,
        });
      }

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error sending message:", errorMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!groupChat) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Group chat not found</p>
            <Button onClick={() => navigate("/group-chats")} variant="outline" className="mt-4">
              Back to Group Chats
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/group-chats")}>
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{groupChat.name}</h1>
                <p className="text-sm text-muted-foreground">{groupChat.members.length} members</p>
              </div>
            </div>

            <Card className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xl">
              <div className="h-[500px] overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-10 w-10 border border-border/60">
                        <AvatarImage src={message.sender_avatar ?? undefined} />
                        <AvatarFallback>{message.sender_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{message.sender_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={sendingMessage}
                placeholder="Type your message..."
              />
            </Card>
          </div>

          <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xl h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Members</h2>
            </div>
            <div className="space-y-2">
              {groupChat.members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-background/40">
                  <Avatar className="h-8 w-8 border border-border/60">
                    <AvatarImage src={member.avatar_url ?? undefined} />
                    <AvatarFallback>{member.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-white truncate">{member.username}</span>
                  {member.id === user?.id && <span className="text-xs text-primary ml-auto">You</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GroupChatMessages;
