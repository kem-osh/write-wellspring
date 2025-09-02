import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  BookOpen, 
  Mic, 
  Search,
  Zap,
  Shield,
  ArrowRight
} from 'lucide-react';

interface WelcomeScreenProps {
  onCreateDocument?: () => void;
  onUploadFiles?: () => void;
  onBrowseTemplates?: () => void;
}

export function WelcomeScreen({ 
  onCreateDocument, 
  onUploadFiles, 
  onBrowseTemplates 
}: WelcomeScreenProps) {
  const features = [
    {
      icon: Mic,
      title: "Voice-to-Text",
      description: "Transform your spoken ideas into structured documents instantly"
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "Find any content across your entire corpus with AI-powered search"
    },
    {
      icon: Sparkles,
      title: "AI Commands",
      description: "Custom mythology analysis and content enhancement tools"
    },
    {
      icon: Shield,
      title: "Secure Storage",
      description: "Your documents are protected with enterprise-grade security"
    }
  ];

  const quickActions = [
    {
      icon: FileText,
      title: "Create Document",
      description: "Start writing your next masterpiece",
      onClick: onCreateDocument,
      variant: "default" as const
    },
    {
      icon: Upload,
      title: "Upload Files",
      description: "Import your existing documents",
      onClick: onUploadFiles,
      variant: "outline" as const
    },
    {
      icon: BookOpen,
      title: "Browse Templates",
      description: "Get started with professional templates",
      onClick: onBrowseTemplates,
      variant: "outline" as const
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse-slow"></div>
            <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 p-8 rounded-2xl backdrop-blur-sm border border-border/50">
              <Zap className="w-16 h-16 mx-auto text-primary mb-4 animate-bounce-subtle" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  LogosScribe
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Your AI-powered writing studio for mythology, theology, and interdisciplinary research. 
                Transform voice notes into structured documents and unlock the wisdom hidden in your corpus.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={action.title}
              className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-border/50 bg-card/50 backdrop-blur-sm"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                  <action.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                </div>
                <Button 
                  variant={action.variant}
                  onClick={action.onClick}
                  className="w-full group"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Powerful Features for Modern Writers
            </h2>
            <p className="text-muted-foreground">
              Everything you need to organize, analyze, and enhance your writing
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="group hover:shadow-md transition-all duration-300 border-border/50 bg-card/30 backdrop-blur-sm"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Getting Started Guide */}
        <Card className="bg-card/30 backdrop-blur-sm border-border/50">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-foreground mb-2">Getting Started Guide</h3>
              <p className="text-muted-foreground">Follow these simple steps to begin your writing journey</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 mx-auto bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h4 className="font-semibold text-foreground">Create or Import</h4>
                <p className="text-sm text-muted-foreground">
                  Start with a new document or import your existing work
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-8 h-8 mx-auto bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h4 className="font-semibold text-foreground">Write & Organize</h4>
                <p className="text-sm text-muted-foreground">
                  Use voice notes or traditional typing to capture your ideas
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-8 h-8 mx-auto bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h4 className="font-semibold text-foreground">Enhance with AI</h4>
                <p className="text-sm text-muted-foreground">
                  Apply custom commands for analysis and enhancement
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}