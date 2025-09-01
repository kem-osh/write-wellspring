import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Settings } from '@/stores/settingsStore';

interface MarkdownPreviewProps {
  content: string;
  settings: Settings;
  className?: string;
}

export function MarkdownPreview({ content, settings, className }: MarkdownPreviewProps) {
  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none h-full overflow-auto p-4",
        settings.fontFamily === 'serif' ? "prose-headings:font-serif prose-p:font-serif" : 
        settings.fontFamily === 'mono' ? "prose-headings:font-mono prose-p:font-mono prose-code:font-mono" : 
        "prose-headings:font-sans prose-p:font-sans",
        className
      )}
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight === 'compact' ? '1.4' : 
                    settings.lineHeight === 'relaxed' ? '1.8' : '1.6',
        fontFamily: settings.fontFamily === 'serif' ? 'Georgia, Times, serif' : 
                    settings.fontFamily === 'mono' ? "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace" : 
                    'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize link rendering for security
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // Customize code blocks
          pre: ({ node, ...props }) => (
            <pre {...props} className="bg-muted text-muted-foreground rounded-md p-4 overflow-x-auto" />
          ),
          code: ({ node, inline, className, children, ...props }: any) => (
            inline ? 
            <code {...props} className="bg-muted text-muted-foreground px-1 py-0.5 rounded text-sm">{children}</code> :
            <code {...props} className={className}>{children}</code>
          ),
          // Style blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote {...props} className="border-l-4 border-primary pl-4 italic text-muted-foreground" />
          ),
          // Style tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} className="border-collapse border border-border" />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th {...props} className="border border-border bg-muted px-4 py-2 text-left font-semibold" />
          ),
          td: ({ node, ...props }) => (
            <td {...props} className="border border-border px-4 py-2" />
          )
        }}
      >
        {content || '*No content to preview*'}
      </ReactMarkdown>
    </div>
  );
}