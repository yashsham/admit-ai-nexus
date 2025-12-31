import { useState, useRef, useEffect } from 'react';
import { ChatService } from "@/lib/ai/ChatService";
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  sessionId?: string;
  onNewSession?: (sessionId: string) => void;
  campaigns?: any[];
  automations?: any[];
  stats?: any;
  onUpgrade?: () => void;
}

export const AIChat = ({ sessionId, onNewSession, campaigns, automations, stats, onUpgrade }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for AdmitConnect. I can help you create campaign scripts, generate personalized messages, analyze candidate data, and provide strategic advice for your outreach campaigns. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialize ChatService with 'dashboard' context
  const chatService = useRef(new ChatService('dashboard'));

  useEffect(() => {
    if (currentSessionId) {
      loadMessages();
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const loadMessages = async () => {
    if (!currentSessionId || !user) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at');

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createSession = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert([
          { user_id: user.id, title: 'New Chat' }
        ])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string) => {
    try {
      await supabase
        .from('ai_chat_messages')
        .insert([
          { session_id: sessionId, role, content }
        ]);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Pass dashboard context (campaigns, automations, and stats) to the chat service
      const dashboardContext = {
        campaigns,
        automations,
        stats
      };

      const response = await chatService.current.generateResponse(
        userMessage,
        conversationHistory,
        dashboardContext,
        undefined,
        user?.id
      );
      return response.content;
    } catch (error) {
      console.error('Error calling AI chat:', error);
      throw new Error('Failed to get AI response');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Ensure we have a session
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = await createSession();
      if (!activeSessionId) {
        toast({
          title: "Error",
          description: "Failed to create chat session",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      setCurrentSessionId(activeSessionId);
      onNewSession?.(activeSessionId);
    }

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    await saveMessage(activeSessionId, 'user', userMessage);

    // Create placeholder for AI response
    const aiMsgId = `ai-${Date.now()}`;
    const newAIMessage: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '', // Start empty
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newAIMessage]);

    try {
      // Pass dashboard context (campaigns, automations, and stats) to the chat service
      const dashboardContext = {
        campaigns,
        automations,
        stats
      };

      // Stream Response
      let accumulatedContent = "";

      await chatService.current.generateResponse(
        userMessage,
        messages.map(m => ({ role: m.role, content: m.content })),
        dashboardContext,
        (token) => {
          accumulatedContent += token;
          setMessages(prev => prev.map(msg =>
            msg.id === aiMsgId ? { ...msg, content: accumulatedContent } : msg
          ));
        },
        user?.id
      );

      // Save final message
      await saveMessage(activeSessionId, 'assistant', accumulatedContent);

    } catch (error: any) {
      console.error('Error generating AI response:', error);

      // Check for Usage Limit (403)
      if (error.message && error.message.includes("403")) {
        toast({
          title: "Usage Limit Reached",
          description: "You have reached your free usage limit. Please upgrade.",
          variant: "destructive",
        });
        const lockMessage = "\n\n🔒 **Usage Limit Reached**. Please [subscribe](/upgrade) to continue.";
        setMessages(prev => prev.map(msg =>
          msg.id === aiMsgId ? { ...msg, content: msg.content + lockMessage } : msg
        ));
        if (onUpgrade) onUpgrade();
      } else {
        toast({
          title: "Error",
          description: "Failed to generate response. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-8 h-8 bg-ai-gradient rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-xs text-muted-foreground">Campaign Strategy & Script Generation</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-ai-gradient text-white">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[70%] rounded-lg p-3 ${message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted'
                  }`}
              >
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {message.role === 'user' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-ai-gradient text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your campaigns..."
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            variant="hero"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};