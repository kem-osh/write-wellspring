import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentSearchProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function DocumentSearch({ onSearch, onClear, placeholder = "Search documents...", isLoading = false }: DocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search when debounced query changes
  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    onClear();
  }, [onClear]);

  return (
    <div className="relative">
      {isLoading && query !== debouncedQuery ? (
        <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
      ) : (
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      )}
      <Input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
        autoComplete="off"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50"
          title="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}