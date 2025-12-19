// Refactored ChatService to use Backend API
// This removes the need for browser-side LangChain/Groq keys

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  title: string;
  url: string;
  content: string;
}

export interface ChatResponse {
  content: string;
  sources?: ChatSource[];
}

export type ChatContext = 'general' | 'dashboard' | 'counselor';

// Get API URL from Vite Env or guess
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export class ChatService {
  private context: ChatContext;
  private isAvailable: boolean = true;

  constructor(context: ChatContext = 'general') {
    this.context = context;
    console.log(`ChatService Initialized (Context: ${context}) - Using Backend: ${API_URL}`);
  }

  public checkAvailability(): boolean {
    return this.isAvailable;
  }

  public async generateResponse(userMessage: string, history: ChatMessage[] = [], dashboardContext?: any): Promise<ChatResponse> {
    try {
      console.log("Sending chat request to backend...");

      const payload = {
        message: userMessage,
        history: history,
        context: this.context
      };

      const response = await fetch(`${API_URL}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return {
        content: data.content,
        sources: data.sources || []
      };

    } catch (error) {
      console.error('ChatService Backend Error:', error);
      return {
        content: "I'm sorry, I encountered an error communicating with the server. Please ensure the backend is running.",
        sources: []
      };
    }
  }
}
