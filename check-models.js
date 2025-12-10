import 'dotenv/config';
const apiKey = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("Error:", data.error);
        } else {
            console.log("Models:", data.models.map(m => m.name));
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

listModels();
