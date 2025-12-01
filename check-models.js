const apiKey = "AIzaSyCmm_9tbCd2My6RX17m4l7mul0ixZG0lOw";

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
