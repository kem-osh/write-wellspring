import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Folder, Palette, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string | null;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Lime', value: '#84cc16' },
];

const FOLDER_ICONS = [
  { name: 'Folder', value: 'folder' },
  { name: 'Documents', value: 'file-text' },
  { name: 'Research', value: 'search' },
  { name: 'Notes', value: 'sticky-note' },
  { name: 'Archive', value: 'archive' },
  { name: 'Projects', value: 'briefcase' },
  { name: 'Ideas', value: 'lightbulb' },
  { name: 'Draft', value: 'edit' },
  { name: 'Final', value: 'check-circle' },
  { name: 'Voice', value: 'mic' },
  { name: 'Mythology', value: 'sparkles' },
  { name: 'Academic', value: 'graduation-cap' },
];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  open,
  onOpenChange,
  parentFolderId
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(FOLDER_ICONS[0].value);
  const [selectedParent, setSelectedParent] = useState<string | undefined>(parentFolderId || undefined);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch folders for parent selection
  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: {
      name: string;
      description?: string;
      color: string;
      icon: string;
      parent_id?: string;
    }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('folders')
        .insert([{
          ...folderData,
          user_id: user.id,
          display_order: 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast({
        title: "Folder created",
        description: "Your new folder has been created successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedColor(FOLDER_COLORS[0].value);
    setSelectedIcon(FOLDER_ICONS[0].value);
    setSelectedParent(parentFolderId || undefined);
  };

  const handleCreateFolder = () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your folder.",
        variant: "destructive",
      });
      return;
    }

    createFolderMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      color: selectedColor,
      icon: selectedIcon,
      parent_id: selectedParent === 'root' ? undefined : selectedParent
    });
  };

  const selectedColorData = FOLDER_COLORS.find(c => c.value === selectedColor);
  const selectedIconData = FOLDER_ICONS.find(i => i.value === selectedIcon);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Folder Preview */}
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Folder 
                className="w-8 h-8" 
                style={{ color: selectedColor }}
              />
              <div>
                <div className="font-medium">
                  {name || 'New Folder'}
                </div>
                {description && (
                  <div className="text-sm text-muted-foreground">
                    {description}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="folder-description">Description (Optional)</Label>
              <Textarea
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this folder contains..."
                className="mt-1 h-20 resize-none"
              />
            </div>

            <div>
              <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select parent folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root Level</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <Folder 
                          className="w-4 h-4" 
                          style={{ color: folder.color }}
                        />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Selection */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4" />
                Color
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedColorData?.name}
              </p>
            </div>

            {/* Icon Selection */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4" />
                Icon Style
              </Label>
              <Select value={selectedIcon} onValueChange={setSelectedIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDER_ICONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedIconData?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFolder} 
            disabled={!name.trim() || createFolderMutation.isPending}
          >
            {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};