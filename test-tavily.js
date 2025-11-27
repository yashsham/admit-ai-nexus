
const apiKey = "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";

async function testTavily() {
    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: "test",
                search_depth: "basic",
                max_results: 1
            })
        });

        if (!response.ok) {
            console.error("Tavily API Error:", response.status, response.statusText);
        } else {
            const data = await response.json();
            console.log("Tavily Success:", data.results ? "Results found" : "No results");
        }
    } catch (error) {
        console.error("Network Error:", error);
    }
}

testTavily();
