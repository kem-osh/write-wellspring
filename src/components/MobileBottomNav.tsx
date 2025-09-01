import { useState } from 'react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Mic, 
  Sparkles, 
  MessageSquare, 
  MoreHorizontal
} from 'lucide-react';

interface MobileBottomNavProps {
  onDocumentLibrary: () => void;
  onVoiceRecord: () => void;
  onAICommands: () => void;
  onAIChat: () => void;
  onSettings: () => void;
  aiLoading?: boolean;
  unreadMessages?: number;
  className?: string;
}

export function MobileBottomNav({
  onDocumentLibrary,
  onVoiceRecord,
  onAICommands,
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
      action: onDocumentLibrary,
      badge: null
    },
    {
      id: 'voice',
      icon: Mic,
      action: onVoiceRecord,
      badge: null,
      special: 'voice'
    },
    {
      id: 'ai',
      icon: Sparkles,
      action: onAICommands,
      badge: null,
      loading: aiLoading,
      special: 'ai'
    },
    {
      id: 'chat',
      icon: MessageSquare,
      action: onAIChat,
      badge: unreadMessages > 0 ? unreadMessages : null
    },
    {
      id: 'more',
      icon: MoreHorizontal,
      action: onSettings,
      badge: null
    }
  ];

  return (
    <>
      {/* Floating Pill Navigation Container */}
      <nav className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        nav-pill
        px-2 py-2
        max-w-fit mx-auto
        ${className}
      `}>
        {/* Navigation Items */}
        <div className="flex items-center justify-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isVoice = item.special === 'voice';
            
            return (
              <div key={item.id} className="relative">
                <EnhancedButton
                  variant={isVoice ? "voice" : "nav-item"}
                  size={isVoice ? "lg" : "icon"}
                  interactive={true}
                  className={`
                    relative transition-all duration-300
                    ${isActive ? 'scale-110' : ''}
                    ${isVoice ? 'mx-2' : ''}
                    focus-ring
                  `}
                  onClick={() => handleTabPress(item.id, item.action)}
                  aria-label={`Navigate to ${item.id}`}
                >
                  {/* Badge */}
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center z-10"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}

                  {/* Loading state for AI */}
                  {item.loading ? (
                    <div className="animate-spin">
                      <Icon className={`${isVoice ? 'h-6 w-6' : 'h-5 w-5'}`} />
                    </div>
                  ) : (
                    <Icon className={`${isVoice ? 'h-6 w-6' : 'h-5 w-5'}`} />
                  )}
                </EnhancedButton>

                {/* Active indicator dot */}
                {isActive && !isVoice && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-scale-in" />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Safe area padding for content */}
      <div className="h-20 pb-safe" />
    </>
  );
}