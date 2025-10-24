import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, Edit } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getDrafts, deleteDraft } from "@/utils/drafts";

interface Draft {
  id: string;
  caption: string;
  location: string | null;
  created_at: string;
}

export default function Drafts() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  const loadDrafts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getDrafts(user.id);
      setDrafts(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load drafts",
        variant: "destructive",
      });
    } finally {
      setLoadingDrafts(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      loadDrafts();
    }
  }, [user, loading, navigate, loadDrafts]);

  const handleDelete = async (draftId: string) => {
    try {
      await deleteDraft(draftId);
      setDrafts(drafts.filter(d => d.id !== draftId));
      toast({
        title: "Draft deleted",
        description: "Your draft has been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive",
      });
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                My Drafts
              </CardTitle>
              <CardDescription>
                Manage your unpublished posts and save them for later
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDrafts ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading drafts...</p>
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No drafts yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start creating and save drafts for later
                  </p>
                  <Button onClick={() => navigate("/create")}>Create New Post</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map(draft => (
                    <div
                      key={draft.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium line-clamp-2">{draft.caption || "(No caption)"}</p>
                        {draft.location && (
                          <p className="text-sm text-muted-foreground mt-1">📍 {draft.location}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {new Date(draft.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(draft.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
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
