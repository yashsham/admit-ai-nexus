import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface ExtractedCandidate {
    name: string;
    phone: string;
    email?: string;
    city?: string;
    course?: string;
}

export const extractCandidatesFromText = async (text: string): Promise<ExtractedCandidate[]> => {
    if (!GROQ_API_KEY) {
        throw new Error("Missing Groq API Key");
    }

    // Truncate text if it's too long to avoid token limits (approx 15k chars is ~4k tokens, safe limit)
    const truncatedText = text.slice(0, 20000);

    const model = new ChatGroq({
        apiKey: GROQ_API_KEY,
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        maxTokens: 4096,
    });

    const systemPrompt = `
    You are a data extraction AI. Your job is to extract candidate information from the provided text.
    
    The text may contain names, phone numbers, emails, locations (cities), and course interests.
    
    RULES:
    1. Extract a JSON array of objects.
    2. Each object MUST have 'name' and 'phone'. If name or phone is missing, skip that person.
    3. 'phone' must be normalized to digits only (e.g., "1234567890"). Remove spaces, dashes, parentheses.
    4. 'email', 'city', and 'course' are optional fields.
    5. Return ONLY the raw JSON array. Do not include markdown formatting (like \`\`\`json). Do not add any conversational text.
    
    Expected JSON Structure:
    [
      {
        "name": "John Doe",
        "phone": "9876543210",
        "email": "john@example.com",
        "city": "Mumbai",
        "course": "B.Tech"
      }
    ]
  `;

    try {
        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(truncatedText)
        ]);

        const content = response.content as string;

        // Clean up potential markdown code blocks if the model ignores the rule
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Error extracting candidates with AI:", error);
        throw new Error("Failed to extract candidates from text");
    }
};
