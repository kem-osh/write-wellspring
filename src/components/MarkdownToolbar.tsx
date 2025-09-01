import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  Link,
  Image,
  Table,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';

interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
}

export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    const text = before + placeholder + after;
    const cursorOffset = placeholder ? -(after.length + placeholder.length) : -after.length;
    onInsert(text, cursorOffset);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-background">
      {/* Text formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('**', '**', 'bold text')}
        title="Bold"
        className="h-8 w-8 p-0"
      >
        <Bold className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('*', '*', 'italic text')}
        title="Italic"
        className="h-8 w-8 p-0"
      >
        <Italic className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('~~', '~~', 'strikethrough')}
        title="Strikethrough"
        className="h-8 w-8 p-0"
      >
        <Strikethrough className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('`', '`', 'code')}
        title="Inline Code"
        className="h-8 w-8 p-0"
      >
        <Code className="w-4 h-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Headings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('# ', '', 'Heading 1')}
        title="Heading 1"
        className="h-8 w-8 p-0"
      >
        <Heading1 className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('## ', '', 'Heading 2')}
        title="Heading 2"
        className="h-8 w-8 p-0"
      >
        <Heading2 className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('### ', '', 'Heading 3')}
        title="Heading 3"
        className="h-8 w-8 p-0"
      >
        <Heading3 className="w-4 h-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Lists and blocks */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('- ', '', 'List item')}
        title="Bullet List"
        className="h-8 w-8 p-0"
      >
        <List className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('1. ', '', 'List item')}
        title="Numbered List"
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('> ', '', 'Blockquote')}
        title="Blockquote"
        className="h-8 w-8 p-0"
      >
        <Quote className="w-4 h-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Links and media */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('[', '](url)', 'link text')}
        title="Link"
        className="h-8 w-8 p-0"
      >
        <Link className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('![', '](image-url)', 'alt text')}
        title="Image"
        className="h-8 w-8 p-0"
      >
        <Image className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertMarkdown('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', '')}
        title="Table"
        className="h-8 w-8 p-0"
      >
        <Table className="w-4 h-4" />
      </Button>
    </div>
  );
}