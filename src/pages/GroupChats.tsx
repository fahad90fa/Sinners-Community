import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Plus, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getGroupChats, createGroupChat } from "@/utils/groupChat";
import type { GroupChat } from "@/utils/groupChat";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function GroupChats() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [newChatName, setNewChatName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [creatingChat, setCreatingChat] = useState(false);

  const loadChats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getGroupChats(user.id);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load group chats",
        variant: "destructive",
      });
    } finally {
      setLoadingChats(false);
    }
  }, [user, toast]);

  const loadProfiles = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .limit(20);
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      loadChats();
      loadProfiles();
    }
  }, [user, loading, navigate, loadChats, loadProfiles]);

  const handleCreateChat = async () => {
    if (!user || !newChatName.trim() || selectedMembers.length === 0) return;

    setCreatingChat(true);
    try {
      const chatData = await createGroupChat(user.id, newChatName, selectedMembers);
      setChats([...chats, chatData]);
      setNewChatName("");
      setSelectedMembers([]);
      toast({
        title: "Group chat created",
        description: `"${newChatName}" has been created with ${selectedMembers.length} members`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create group chat";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Create group chat error:", error);
    } finally {
      setCreatingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-6 w-6" />
                  Group Chats
                </CardTitle>
                <CardDescription>
                  Create and manage group conversations
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Group Chat</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Group name"
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      disabled={creatingChat}
                    />
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Members</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {profiles.map(profile => (
                          <button
                            key={profile.id}
                            onClick={() => {
                              setSelectedMembers(
                                selectedMembers.includes(profile.id)
                                  ? selectedMembers.filter(id => id !== profile.id)
                                  : [...selectedMembers, profile.id]
                              );
                            }}
                            className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(profile.id)}
                              onChange={() => {}}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{profile.username}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateChat}
                      disabled={creatingChat || !newChatName.trim() || selectedMembers.length === 0}
                      className="w-full"
                    >
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingChats ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading group chats...</p>
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No group chats yet</p>
                  <p className="text-sm text-muted-foreground">Create a group to start chatting</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => navigate(`/messages?group=${chat.id}`)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="font-medium">{chat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(chat.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
