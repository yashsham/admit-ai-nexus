from app.core.config import settings
from app.ai.models.llm_factory import get_llm_with_fallback

async def generate_personalized_content(candidate: dict, prompt: str, channel: str, verified_link: str = None, sender_name: str = "Admit AI Team") -> str:
    """
    Generates a unique message for a specific candidate based on the user's prompt.
    ASYNC version to support proper event loop usage in FastAPI.
    """
    # Lazy Init with Fallback
    llm = get_llm_with_fallback(temperature=0.9)
    print(f"DEBUG: Generating content for {candidate.get('name')} via {channel}")
    
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
        Sender Name: "{sender_name}"

        Instructions:
        1. **Analyze the Goal**: specific tone and structure should be dictated by the "Campaign Goal". 
           - If it's an event invite -> Be exciting and clear.
           - If it's a newsletter -> Be informative and structured.
           - If it's a personal outreach -> Be warm and conversational.
        2. **Style & Tone**: Adaptive. Use your creativity to choose the best approach. 
        3. **High Variety**: Do NOT use a standard "I hope you are doing well" opening. Vary your sentence structure.
        4. **Formatting Capabilities**:
           - You have full HTML capabilities for the `BODY`.
           - **Use `<h2>`** for headlines.
           - **Use `<ul>/<li>`** for lists.
           - **Use `<b>`** to highlight key details.
        5. **Strict Rules**:
           - **Do NOT** use placeholders like "[Your Name]".
           - **Sign off explicitly** as: "Best regards, <br>{sender_name}".
           - **MUST include** the "Verified Official Link" ({verified_link}) in the Call to Action.
           
        Format Requirements:
        - **DO NOT RETURN JSON**.
        - **Format**:
          SUBJECT: [Your Creative Subject Line]
          BODY:
          [Your RAW HTML Body Content]
        """

    elif channel == "whatsapp":
        system_instruction = f"""
        You are {sender_name}, a top-tier WhatsApp Marketing Strategist. 
        Your goal is to write a **detailed, engaging, and personal** message to a student.

        Recipient Profile:
        - Name: {name}
        - City: {city}
        - Interest: {course}
        
        Campaign Goal: "{prompt}"
        Verified Link: "{verified_link if verified_link else '[Link]'}"
        Sender Name: "{sender_name}"

        Instructions:
        1. **Style**: 
           - **Conversational & Rich**: Do NOT write short 160-char SMS style. 
           - **Tone**: Personalized, warm, and professional.
           - **Formatting**: Use *Bold*, _Italic_, and bullet emojis.
        2. **Structure**:
           - **Opening**: Personal greeting + warm hook (mention {city}!).
           - **Core Value**: Why {course} is great.
           - **Call to Action**: Click the link.
        3. **High Variety**:
           - VARY your opening. Do not use the same hook line twice.
        4. **Strict Rules**:
            - **Do NOT** use placeholders like "[Your Name]".
            - Sign off simply with "- {sender_name}".

        Format Requirements:
        - Output **ONLY** the raw message text.
        - Do not use "SUBJECT:" or "BODY:". Just the message.
        - Do not use HTML tags <b>. Use *asterisks*.
        - Include the Verified Link explicitly.
        """
    else:
        system_instruction = f"""
        You are {sender_name}, an expert Admissions Counselor. 
        Your goal is to write a SHORT, Personalized {channel} message.
        
        Recipient Profile:
        - Name: {name}
        - Interest: {course}
        
        User Instructions: "{prompt}"
        
        Constraints:
        - Strict limit: Under 160 characters.
        - No placeholders. 
        - Sign off as {sender_name}.
        """
    
    try:
        response = await llm.ainvoke(system_instruction)
        content = response.content.strip()
        print(f"DEBUG: LLM Response ({len(content)} chars): {content[:50]}...")
        
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
