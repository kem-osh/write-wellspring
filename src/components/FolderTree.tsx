import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  document_count?: number;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  display_order?: number;
}

interface FolderTreeProps {
  folders: Folder[];
  selectedFolder?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  className?: string;
}

interface FolderNodeProps {
  folder: Folder;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  children: Folder[];
  onSelect: (folderId: string) => void;
  onToggle: (folderId: string) => void;
  onEdit?: (folder: Folder) => void;
  onDelete?: (folder: Folder) => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  level,
  isSelected,
  isExpanded,
  children,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const hasChildren = children.length > 0;
  const indentSize = level * 16;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center px-2 py-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10 text-primary font-medium"
        )}
        style={{ paddingLeft: `${8 + indentSize}px` }}
      >
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 mr-1"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              onToggle(folder.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : (
            <div className="w-3 h-3" />
          )}
        </Button>

        {/* Folder Icon */}
        <div className="mr-2">
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-4 h-4" style={{ color: folder.color || '#6B7280' }} />
          ) : (
            <Folder className="w-4 h-4" style={{ color: folder.color || '#6B7280' }} />
          )}
        </div>

        {/* Folder Name */}
        <div
          className="flex-1 flex items-center justify-between min-w-0"
          onClick={() => onSelect(folder.id)}
        >
          <span className="truncate mr-2">{folder.name}</span>
          
          <div className="flex items-center gap-1">
            {(folder.document_count || 0) > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {folder.document_count || 0}
              </Badge>
            )}
            
            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(folder)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Folder
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(folder)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Folder
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Child Folders */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((childFolder) => (
            <FolderNodeContainer
              key={childFolder.id}
              folder={childFolder}
              folders={[]} // Will be populated by parent
              level={level + 1}
              selectedFolder={undefined} // Will be set by parent
              onFolderSelect={() => {}} // Will be set by parent
              onEditFolder={onEdit}
              onDeleteFolder={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Container component to handle the folder logic
const FolderNodeContainer: React.FC<{
  folder: Folder;
  folders: Folder[];
  level: number;
  selectedFolder?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
}> = ({ folder, folders, level, selectedFolder, onFolderSelect, onEditFolder, onDeleteFolder }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const children = useMemo(() => 
    folders.filter(f => f.parent_id === folder.id),
    [folders, folder.id]
  );

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  return (
    <FolderNode
      folder={folder}
      level={level}
      isSelected={selectedFolder === folder.id}
      isExpanded={expandedFolders.has(folder.id)}
      children={children}
      onSelect={onFolderSelect}
      onToggle={toggleFolder}
      onEdit={onEditFolder}
      onDelete={onDeleteFolder}
    />
  );
};

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolder,
  onFolderSelect,
  onEditFolder,
  onDeleteFolder,
  className,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build folder hierarchy
  const rootFolders = useMemo(() => 
    folders.filter(folder => !folder.parent_id),
    [folders]
  );

  const getFolderChildren = (parentId: string): Folder[] =>
    folders.filter(folder => folder.parent_id === parentId);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderFolder = (folder: Folder, level: number = 0): React.ReactNode => {
    const children = getFolderChildren(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;

    return (
      <div key={folder.id}>
        <FolderNode
          folder={folder}
          level={level}
          isSelected={isSelected}
          isExpanded={isExpanded}
          children={children}
          onSelect={onFolderSelect}
          onToggle={toggleFolder}
          onEdit={onEditFolder}
          onDelete={onDeleteFolder}
        />
        
        {isExpanded && children.map(child => renderFolder(child, level + 1))}
      </div>
    );
  };

  return (
    <div className={cn("space-y-1 p-2", className)}>
      {/* All Documents Option */}
      <div
        className={cn(
          "flex items-center px-2 py-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted/50",
          !selectedFolder && "bg-primary/10 text-primary font-medium"
        )}
        onClick={() => onFolderSelect(null)}
      >
        <div className="w-6 h-6 mr-1" /> {/* Spacer for alignment */}
          <FolderOpen className="w-4 h-4 mr-2 text-muted-foreground" />
        <span>All Documents</span>
        <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
          {folders.reduce((sum, f) => sum + (f.document_count || 0), 0)}
        </Badge>
      </div>

      {/* Folder Tree */}
      {rootFolders.map(folder => renderFolder(folder))}
      
      {folders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No folders yet</p>
          <p className="text-xs">Create a folder to organize your documents</p>
        </div>
      )}
    </div>
  );
};