import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { Folder, Plus, X } from 'lucide-react';

interface Folder {
  id: string;
  name: string;
  path?: string;
  parent_id?: string;
}

interface MoveToFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentIds: string[];
  onMoveComplete: () => void;
}

export function MoveToFolderDialog({
  isOpen,
  onClose,
  documentIds,
  onMoveComplete
}: MoveToFolderDialogProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { impactLight, notificationSuccess, notificationError } = useHaptics();

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('path');

      if (error) throw error;
      // Map database response to Folder interface
      const mappedFolders = (data || []).map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        path: folder.name, // Use name as path for now
        parent_id: folder.parent_id
      }));
      setFolders(mappedFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast({
        title: "Error loading folders",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: newFolderName.trim(),
          user_id: user.id,
          sort_order: folders.length
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: Folder = {
        id: data.id,
        name: data.name,
        path: data.name,
        parent_id: data.parent_id
      };
      setFolders(prev => [...prev, newFolder]);
      setSelectedFolderId(data.id);
      setNewFolderName('');
      setIsCreatingFolder(false);
      
      toast({
        title: "Folder created",
        description: `"${newFolderName}" has been created.`,
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      notificationError();
      toast({
        title: "Error creating folder",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const moveDocuments = async () => {
    if (documentIds.length === 0) return;

    try {
      setIsLoading(true);
      impactLight();

      const { error } = await supabase
        .from('documents')
        .update({ 
          folder_id: selectedFolderId || null 
        })
        .in('id', documentIds);

      if (error) throw error;

      notificationSuccess();
      toast({
        title: "Documents moved",
        description: `${documentIds.length} document(s) moved successfully.`,
      });

      onMoveComplete();
      onClose();
    } catch (error) {
      console.error('Error moving documents:', error);
      notificationError();
      toast({
        title: "Error moving documents",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFolderId('');
    setIsCreatingFolder(false);
    setNewFolderName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Move {documentIds.length} Document{documentIds.length > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isCreatingFolder ? (
            <>
              {/* Folder Selection */}
              <div className="space-y-2">
                <Label>Select destination folder</Label>
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose folder (or leave empty for root)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">📁 Root (No folder)</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        📁 {folder.path || folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Create New Folder Button */}
              <Button
                variant="outline"
                onClick={() => setIsCreatingFolder(true)}
                className="w-full justify-center"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Folder
              </Button>
            </>
          ) : (
            <>
              {/* Create Folder Form */}
              <div className="space-y-3">
                <Label>Create new folder</Label>
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder();
                    if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    onClick={createFolder}
                    disabled={!newFolderName.trim() || isLoading}
                    className="flex-1"
                  >
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={moveDocuments}
              disabled={isLoading || isCreatingFolder}
              className="flex-1"
            >
              {isLoading ? 'Moving...' : 'Move Documents'}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}