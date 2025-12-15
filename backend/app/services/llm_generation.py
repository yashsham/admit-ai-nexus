from app.core.config import settings
from langchain_groq import ChatGroq

def generate_personalized_content(candidate: dict, prompt: str, channel: str, verified_link: str = None) -> str:
    """
    Generates a unique message for a specific candidate based on the user's prompt.
    """
    # Lazy Init to ensure Env Vars are loaded
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=0.9
    )
    
    # safe defaults
    name = candidate.get("name", "Student")
    city = candidate.get("city", "your city")
    course = candidate.get("course", "our programs")
    
    
    # Construct a specific prompt for the LLM
    if channel == "email":
        system_instruction = f"""
        You are a world-class Marketing Copywriter and Admissions Expert.
        Your goal is to write a highly engaging, persuasive, and creative marketing email for a prospective student.

        Recipient Profile:
        - Name: {name}
        - City: {city}
        - Interest: {course} (This is their primary area of interest)
        
        Campaign Goal: "{prompt}"
        Verified Official Link: "{verified_link if verified_link else '[Insert Link]'}"

        Instructions:
        1. **Analyze the Goal**: specific tone and structure should be dictated by the "Campaign Goal". 
           - If it's an event invite -> Be exciting and clear.
           - If it's a newsletter -> Be informative and structured.
           - If it's a personal outreach -> Be warm and conversational.
        2. **Style & Tone**: Adaptive. Use your creativity to choose the best approach. Do NOT rigidly follow a single "Direct Response" formula unless it fits.
        3. **Formatting Capabilities**:
           - You have full HTML capabilities for the `BODY`.
           - **Use `<h2>`** for headlines if the email needs a strong opening.
           - **Use `<ul>/<li>`** for lists if you are presenting multiple benefits or details.
           - **Use `<b>`** to highlight key details.
           - **Use `<br><br>`** for whitespace.
           - *Decision*: If a simple text email is better for the goal, use simple paragraphs. If a rich marketing email is better, use the HTML tags.
        4. **Verified Link**:
           - You MUST include the "Verified Official Link" provided above (`{verified_link}`) in your Call to Action or relevant section.
           
        Format Requirements:
        - **DO NOT RETURN JSON**.
        - **Format**:
          SUBJECT: [Your Creative Subject Line]
          BODY:
          [Your RAW HTML Body Content]
        """

    elif channel == "whatsapp":
        system_instruction = f"""
        You are a top-tier WhatsApp Marketing Strategist. 
        Your goal is to write a **detailed, engaging, and personal** message to a student.

        Recipient Profile:
        - Name: {name}
        - City: {city}
        - Interest: {course}
        
        Campaign Goal: "{prompt}"
        Verified Link: "{verified_link if verified_link else '[Link]'}"

        Instructions:
        1. **Style**: 
           - **Conversational & Rich**: Do NOT write short 160-char SMS style. Write like a thoughtful email but optimized for chat.
           - **Tone**: Warm, helpful, and professional.
           - **Formatting**: Use WhatsApp formatting:
             - *Bold* text using asterisks (e.g., *Headline*).
             - _Italic_ text using underscores.
             - Bullet points using emojis substitute (e.g., [Benefit], [Value]).
             - Paragraph spacing (double newlines) is CRITICAL for readability.
        2. **Structure**:
           - **Opening**: Personal greeting + warm hook (mention {city}!).
           - **Core Value**: 2-3 short paragraphs explaining why {course} is the right move.
           - **Key Highlights**: An emoji list of 3 benefits.
           - **Call to Action**: Direct invitation to click the link.
        3. **Uniqueness**:
           - Ask a question or mention a specific detail about {city} to make it feel 1-to-1.
           - VARY your opening and closing for every single generation.

        Format Requirements:
        - Output **ONLY** the raw message text.
        - Do not use "SUBJECT:" or "BODY:". Just the message.
        - Do not use HTML tags <b>. Use *asterisks*.
        - Include the Verified Link explicitly.
        """
    else:
        system_instruction = f"""
        You are an expert Admissions Counselor. 
        Your goal is to write a SHORT, Personalized {channel} message.
        
        Recipient Profile:
        - Name: {name}
        - City: {city}
        - Interest: {course}
        
        User Instructions: "{prompt}"
        
        Constraints:
        - Strict limit: Under 160 characters for WhatsApp, under 50 words for Voice status.
        - No emojis unless asked.
        - RETURN ONLY THE MESSAGE CONTENT. Do not include "Here is the message:" or quotes.
        """
    
    try:
        response = llm.invoke(system_instruction)
        content = response.content.strip()
        
        # Robust cleanup for JSON
        if channel == "email":
            # Remove potential markdown wrappers
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
        return content
    except Exception as e:
        print(f"LLM Generation Error for {name}: {e}")
        # Fallback if LLM fails
        if channel == "email":
            return '{"subject": "Update regarding your application", "body": "Hi ' + name + ', please contact us regarding your interest in ' + course + '."}'
        return f"Hi {name}, regarding your interest in {course}. Please contact us."
