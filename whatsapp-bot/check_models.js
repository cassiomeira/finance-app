import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_KEY;
if (!apiKey) {
    console.error("Sem GEMINI_KEY");
    process.exit(1);
}

console.log(`🔑 Testando chave: ${apiKey.substring(0, 10)}...`);

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.models) {
            console.log("✅ Modelos Disponíveis:");
            data.models.forEach(m => {
                // Filter for generateContent supported models
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.error("❌ Erro ao listar:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Erro fatal:", e);
    }
}

listModels();
