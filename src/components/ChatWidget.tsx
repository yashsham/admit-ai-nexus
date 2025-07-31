import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hi! I'm your AI college counselor. I can help you with admissions, applications, and campus information. How can I assist you today?",
      role: "assistant",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMessage.content,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Widget Toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className={cn(
            "rounded-full w-14 h-14 shadow-elegant hover-lift transition-all duration-300",
            isOpen ? "rotate-180" : "animate-pulse"
          )}
          variant="hero"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] z-40 shadow-2xl border-2 border-primary/20 animate-scale-in">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-subtle rounded-t-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-ai-gradient rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI College Counselor</h3>
                  <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start space-x-2",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="w-6 h-6 bg-ai-gradient rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[280px] p-3 rounded-lg text-sm transition-all duration-200",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto hover-lift"
                          : "bg-secondary text-secondary-foreground hover-scale"
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" && (
                      <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-ai-gradient rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-secondary p-3 rounded-lg">
                      <LoadingSpinner size="sm" />
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about admissions, applications..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="flex-shrink-0 hover-lift"
                  variant="hero"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}
    </>
  );
};