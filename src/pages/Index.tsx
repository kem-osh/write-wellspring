import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Mic, Search } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background">
      <div className="container mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Writing Studio</span>
          </div>
          
          <h1 className="text-display-lg bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            LogosScribe
          </h1>
          
          <p className="text-heading-md text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform your ideas into structured content with AI-powered writing tools, 
            voice transcription, and intelligent document management.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <FileText className="h-5 w-5" />
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card variant="interactive" padding="lg" className="group">
            <div className="flex flex-col items-start space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-heading-md mb-2">Voice-First Writing</h3>
                <p className="text-body-md text-muted-foreground">
                  Capture ideas on-the-go with voice transcription that automatically 
                  structures your thoughts into readable content.
                </p>
              </div>
            </div>
          </Card>

          <Card variant="interactive" padding="lg" className="group">
            <div className="flex flex-col items-start space-y-4">
              <div className="p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-heading-md mb-2">AI Enhancement</h3>
                <p className="text-body-md text-muted-foreground">
                  Enhance your writing with intelligent suggestions, automatic editing, 
                  and content analysis powered by advanced AI.
                </p>
              </div>
            </div>
          </Card>

          <Card variant="interactive" padding="lg" className="group">
            <div className="flex flex-col items-start space-y-4">
              <div className="p-3 rounded-lg bg-secondary/20 text-secondary-foreground group-hover:bg-secondary/30 transition-colors">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-heading-md mb-2">Smart Organization</h3>
                <p className="text-body-md text-muted-foreground">
                  Organize and search through your entire corpus with semantic search 
                  and intelligent categorization.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card variant="elevated" padding="xl" className="max-w-2xl mx-auto bg-gradient-to-r from-card to-surface">
            <div className="space-y-6">
              <h2 className="text-heading-lg">Ready to transform your writing workflow?</h2>
              <p className="text-body-lg text-muted-foreground">
                Join writers who have already discovered the power of AI-enhanced writing.
              </p>
              <Button size="lg" className="gap-2">
                <FileText className="h-5 w-5" />
                Start Writing Now
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
