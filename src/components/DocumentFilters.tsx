import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Plus, X, Palette } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

interface FilterOptions {
  category: string;
  status: string[];
  sortBy: 'recent' | 'oldest' | 'az' | 'za' | 'wordcount';
  folderId?: string;
}

interface DocumentFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  initialFilters: FilterOptions;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'polished', label: 'Polished', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'final', label: 'Final', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az', label: 'A to Z' },
  { value: 'za', label: 'Z to A' },
  { value: 'wordcount', label: 'Word Count' }
];

const PRESET_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'
];

export function DocumentFilters({ onFiltersChange, initialFilters }: DocumentFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const loadCategories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    if (error) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCategories(data || []);
  };

  const createCategory = async () => {
    if (!user || !newCategoryName.trim()) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('categories')
      .insert([{
        user_id: user.id,
        name: newCategoryName.trim(),
        color: newCategoryColor,
        display_order: categories.length
      }]);

    if (error) {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Category created",
        description: `"${newCategoryName}" has been added to your categories.`,
      });
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      loadCategories();
    }
    setIsLoading(false);
  };

  const deleteCategory = async (categoryId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Category deleted",
        description: "Category has been removed.",
      });
      loadCategories();
    }
  };

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ ...prev, category: value }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const handleSortChange = (value: string) => {
    setFilters(prev => ({ ...prev, sortBy: value as FilterOptions['sortBy'] }));
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      status: [],
      sortBy: 'recent',
      folderId: undefined
    });
  };

  const hasActiveFilters = filters.category !== 'all' || filters.status.length > 0;

  return (
    <div className="space-y-4 p-4 border-b">
      {/* Category Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">CATEGORY</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCategoryManager(true)}
            className="h-6 px-2"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
        <Select value={filters.category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">STATUS</Label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <Badge
              key={status.value}
              variant={filters.status.includes(status.value) ? "default" : "secondary"}
              className={`cursor-pointer text-xs ${
                filters.status.includes(status.value) ? status.color : ''
              }`}
              onClick={() => handleStatusToggle(status.value)}
            >
              {status.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">SORT BY</Label>
        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full h-8 text-xs"
        >
          Clear Filters
        </Button>
      )}

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add, edit, or remove document categories.
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add New Category */}
            <div className="space-y-3">
              <Label>Add New Category</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createCategory()}
                />
                <Button
                  onClick={createCategory}
                  disabled={!newCategoryName.trim() || isLoading}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      newCategoryColor === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Existing Categories */}
            <div className="space-y-2">
              <Label>Your Categories</Label>
              <div className="max-h-48 overflow-auto space-y-2">
                {categories.filter(c => !c.is_default).map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                      className="h-6 px-2 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
