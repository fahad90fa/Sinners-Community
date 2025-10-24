import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getCollections, createCollection, addPostToCollection, removePostFromCollection } from "@/utils/collections";

interface CollectionsModalProps {
  postId: string;
  userId: string;
}

export default function CollectionsModal({ postId, userId }: CollectionsModalProps) {
  const { toast } = useToast();
  const [collections, setCollections] = useState<any[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadCollections();
    }
  }, [open]);

  const loadCollections = async () => {
    try {
      const data = await getCollections(userId);
      setCollections(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load collections",
        variant: "destructive",
      });
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setLoading(true);
    try {
      const newCollection = await createCollection(userId, newCollectionName);
      setCollections([...collections, newCollection]);
      setNewCollectionName("");
      toast({
        title: "Collection created",
        description: `"${newCollectionName}" has been created`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCollection = async (collectionId: string, isSelected: boolean) => {
    setLoading(true);
    try {
      if (isSelected) {
        await removePostFromCollection(collectionId, postId);
        selectedCollections.delete(collectionId);
      } else {
        await addPostToCollection(collectionId, postId);
        selectedCollections.add(collectionId);
      }
      setSelectedCollections(new Set(selectedCollections));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Save to collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              disabled={loading}
            />
            <Button
              onClick={handleCreateCollection}
              disabled={loading || !newCollectionName.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {collections.map(collection => (
              <button
                key={collection.id}
                onClick={() => handleToggleCollection(collection.id, selectedCollections.has(collection.id))}
                disabled={loading}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded transition-colors"
              >
                <div
                  className={`w-4 h-4 border rounded flex items-center justify-center ${
                    selectedCollections.has(collection.id) ? 'bg-primary' : ''
                  }`}
                >
                  {selectedCollections.has(collection.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <span className="text-sm">{collection.name}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
