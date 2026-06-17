
const apiKey = "gsk_Z0JIWCFongrH1IXbPqbtWGdyb3FYgMEJjkrp3kOkldX6zZDtTmILm";

async function testGroq() {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [{ role: "user", content: "Hello" }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", JSON.stringify(errorData, null, 2));
        } else {
            const data = await response.json();
            console.log("Success:", data.choices[0].message.content);
        }
    } catch (error) {
        console.error("Network Error:", error);
    }
}

testGroq();
