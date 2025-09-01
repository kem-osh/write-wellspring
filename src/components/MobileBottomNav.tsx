import { useState } from 'react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Mic, 
  Sparkles, 
  MessageSquare, 
  Settings,
  Plus,
  MoreHorizontal
} from 'lucide-react';

interface MobileBottomNavProps {
  onDocumentLibrary: () => void;
  onVoiceRecord: () => void;
  onAIChat: () => void;
  onSettings: () => void;
  aiLoading?: boolean;
  unreadMessages?: number;
  className?: string;
}

export function MobileBottomNav({
  onDocumentLibrary,
  onVoiceRecord,
  onAIChat,
  onSettings,
  aiLoading = false,
  unreadMessages = 0,
  className = ""
}: MobileBottomNavProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleTabPress = (tabId: string, action: () => void) => {
    setActiveTab(tabId);
    action();
    // Reset active state after animation
    setTimeout(() => setActiveTab(null), 200);
  };

  const navItems = [
    {
      id: 'documents',
      icon: FileText,
      label: 'Docs',
      action: onDocumentLibrary,
      badge: null
    },
    {
      id: 'voice',
      icon: Mic,
      label: 'Voice',
      action: onVoiceRecord,
      badge: null,
      special: 'voice'
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
      action: onAIChat,
      badge: unreadMessages > 0 ? unreadMessages : null
    },
    {
      id: 'more',
      icon: MoreHorizontal,
      label: 'More',
      action: onSettings,
      badge: null
    }
  ];

  return (
    <nav className={`
      fixed bottom-0 left-0 right-0 z-40
      bg-background/95 backdrop-blur-md border-t border-border
      pb-safe
      ${className}
    `}>
      {/* Floating Action Button */}
      <EnhancedButton
        variant="voice"
        size="fab"
        className="absolute -top-7 left-1/2 transform -translate-x-1/2 shadow-2xl"
        onClick={() => handleTabPress('voice', onVoiceRecord)}
      >
        <Plus className="h-6 w-6" />
      </EnhancedButton>

      {/* Navigation Items */}
      <div className="flex items-center justify-around px-4 py-3 pt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isSpecial = item.special === 'voice';
          
          if (item.id === 'voice') {
            // Skip the voice button as it's the FAB
            return <div key={item.id} className="w-14" />;
          }

          return (
            <EnhancedButton
              key={item.id}
              variant="ghost"
              size="icon"
              interactive={true}
              className={`
                flex flex-col items-center justify-center gap-1 h-auto py-2 px-3 min-w-[56px]
                transition-all duration-200 rounded-xl
                ${isActive ? 'bg-primary/10 text-primary scale-110' : 'text-muted-foreground'}
                ${isSpecial ? 'hover:text-primary' : 'hover:text-foreground'}
                touch-target focus-ring relative
              `}
              onClick={() => handleTabPress(item.id, item.action)}
            >
              {/* Badge */}
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </Badge>
              )}

              {/* Loading state for AI */}
              <Icon className="h-5 w-5" />
              
              <span className={`
                text-xs font-medium transition-all duration-200
                ${isActive ? 'text-primary' : 'text-current'}
              `}>
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </EnhancedButton>
          );
        })}
      </div>
    </nav>
  );
}