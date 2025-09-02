import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Plus, X, Search, Grid, List, Filter } from 'lucide-react';
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
  searchQuery?: string;
  viewMode?: 'grid' | 'list';
  folderId?: string;
}
interface DocumentFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  onSearchChange?: (query: string) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  initialFilters: FilterOptions;
  documentCount?: number;
}
const STATUS_OPTIONS = [{
  value: 'draft',
  label: 'Draft',
  color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
}, {
  value: 'polished',
  label: 'Polished',
  color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
}, {
  value: 'final',
  label: 'Final',
  color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
}];
const SORT_OPTIONS = [{
  value: 'recent',
  label: 'Most Recent'
}, {
  value: 'oldest',
  label: 'Oldest First'
}, {
  value: 'az',
  label: 'A to Z'
}, {
  value: 'za',
  label: 'Z to A'
}, {
  value: 'wordcount',
  label: 'Word Count'
}];
const PRESET_COLORS = ['#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];
export function DocumentFilters({
  onFiltersChange,
  onSearchChange,
  onViewModeChange,
  initialFilters,
  documentCount = 0
}: DocumentFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle debounced search
  useEffect(() => {
    onSearchChange?.(debouncedSearch);
    setFilters(prev => ({
      ...prev,
      searchQuery: debouncedSearch
    }));
  }, [debouncedSearch, onSearchChange]);
  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);
  const loadCategories = async () => {
    if (!user) return;
    const {
      data,
      error
    } = await supabase.from('categories').select('*').eq('user_id', user.id).order('display_order');
    if (error) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    setCategories(data || []);
  };
  const createCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    setIsLoading(true);
    const {
      error
    } = await supabase.from('categories').insert([{
      user_id: user.id,
      name: newCategoryName.trim(),
      color: newCategoryColor,
      display_order: categories.length
    }]);
    if (error) {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Category created",
        description: `"${newCategoryName}" has been added to your categories.`
      });
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      loadCategories();
    }
    setIsLoading(false);
  };
  const deleteCategory = async (categoryId: string) => {
    if (!user) return;
    const {
      error
    } = await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', user.id);
    if (error) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Category deleted",
        description: "Category has been removed."
      });
      loadCategories();
    }
  };
  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      category: value
    }));
  };
  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status) ? prev.status.filter(s => s !== status) : [...prev.status, status]
    }));
  };
  const handleSortChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: value as FilterOptions['sortBy']
    }));
  };
  const clearFilters = () => {
    setFilters({
      category: 'all',
      status: [],
      sortBy: 'recent',
      folderId: undefined
    });
  };
  const hasActiveFilters = filters.category !== 'all' || filters.status.length > 0 || searchQuery.length > 0;
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.status.length > 0) count += filters.status.length;
    if (searchQuery.length > 0) count++;
    return count;
  }, [filters.category, filters.status.length, searchQuery]);
  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setFilters(prev => ({
      ...prev,
      viewMode: mode
    }));
    onViewModeChange?.(mode);
  }, [onViewModeChange]);
  return <div className="space-y-4 p-5 bg-surface/30 rounded-xl border border-border/50 shadow-soft backdrop-blur-sm">
      {/* Header with filter count */}
      <div className="flex items-center justify-between">
        
        <div className="text-xs text-muted-foreground">
          {documentCount} document{documentCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search Input */}
      <div className="space-y-2">
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9 bg-background/50 border-border/60 focus:border-primary/60 rounded-lg" />
          {searchQuery && <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted">
              <X className="h-3 w-3" />
            </Button>}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="space-y-2">
        
        <div className="flex border border-border/60 rounded-lg p-1 bg-background/50">
          <Button variant={filters.viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => handleViewModeChange('grid')} className="flex-1 h-7 text-xs">
            <Grid className="h-3 w-3 mr-1" />
            Grid
          </Button>
          <Button variant={filters.viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => handleViewModeChange('list')} className="flex-1 h-7 text-xs my-0 rounded-md px-[13px] mx-0">
            <List className="h-3 w-3 mr-1" />
            List
          </Button>
        </div>
      </div>
      {/* Category Filter */}
      <div className="space-y-3">
        
        <Select value={filters.category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-9 bg-background/50 border-border/60 hover:border-border focus:border-primary/60 rounded-lg shadow-soft">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface/95 backdrop-blur-lg border-border/60 shadow-elevated rounded-xl">
            <SelectItem value="all" className="rounded-lg">All Categories</SelectItem>
            {categories.map(category => <SelectItem key={category.id} value={category.name} className="rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{
                backgroundColor: category.color
              }} />
                  {category.name}
                </div>
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(status => <Badge key={status.value} variant={filters.status.includes(status.value) ? "default" : "secondary"} className={`cursor-pointer text-xs hover:shadow-soft transition-all duration-200 px-3 py-1.5 rounded-lg ${filters.status.includes(status.value) ? 'bg-primary text-primary-foreground shadow-soft' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => handleStatusToggle(status.value)}>
              {status.label}
            </Badge>)}
        </div>
      </div>

      {/* Sort Options */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sort By</Label>
        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="h-9 bg-background/50 border-border/60 hover:border-border focus:border-primary/60 rounded-lg shadow-soft">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface/95 backdrop-blur-lg border-border/60 shadow-elevated rounded-xl">
            {SORT_OPTIONS.map(option => <SelectItem key={option.value} value={option.value} className="rounded-lg">
                {option.label}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full h-9 text-xs font-medium hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors border border-border/40">
          Clear All Filters
        </Button>}

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-md bg-surface/95 backdrop-blur-lg border-border/60 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-heading-sm">Manage Categories</DialogTitle>
            <p className="text-body-sm text-muted-foreground">
              Add, edit, or remove document categories.
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add New Category */}
            <div className="space-y-3">
              <Label>Add New Category</Label>
              <div className="flex gap-2">
                <Input placeholder="Category name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createCategory()} />
                <Button onClick={createCategory} disabled={!newCategoryName.trim() || isLoading} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-1">
                {PRESET_COLORS.map(color => <button key={color} onClick={() => setNewCategoryColor(color)} className={`w-6 h-6 rounded border-2 ${newCategoryColor === color ? 'border-foreground' : 'border-transparent'}`} style={{
                backgroundColor: color
              }} />)}
              </div>
            </div>

            {/* Existing Categories */}
            <div className="space-y-2">
              <Label>Your Categories</Label>
              <div className="max-h-48 overflow-auto space-y-2">
                {categories.filter(c => !c.is_default).map(category => <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: category.color
                  }} />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteCategory(category.id)} className="h-6 px-2 text-destructive hover:text-destructive">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}