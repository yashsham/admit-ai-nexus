import{C as s,S as c,H as i}from"./index-CZFC4Pn4.js";const m="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",p=async t=>{const o=t.slice(0,2e4),a=new s({apiKey:m,model:"llama-3.3-70b-versatile",temperature:0,maxTokens:4096}),n=`
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
  `;try{const r=(await a.invoke([new c(n),new i(o)])).content.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(r)}catch(e){throw console.error("Error extracting candidates with AI:",e),new Error("Failed to extract candidates from text")}};export{p as extractCandidatesFromText};
