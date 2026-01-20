
export const aiService = {
    parseReminder: async (text: string) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error("Chave da API do Gemini não configurada.");

        // FIX: Use user's local time string instead of ISO (UTC)
        // This ensures that "today" means the user's actual today, not tomorrow (if late night)
        const now = new Date();
        const localDate = now.toLocaleDateString('pt-BR'); // e.g., "19/01/2026"
        const localTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const prompt = `
      Analise o texto abaixo e extraia os dados para um lembrete (Agenda).
      Texto: "${text}"
      
      DATA/HORA ATUAL DO USUÁRIO: ${localDate} às ${localTime}
      
      Regras:
      1. Se o usuário falar "hoje", use a data ${localDate}.
      2. Se o usuário falar "amanhã", calcule data atual + 1 dia.
      3. Se não falar data, assuma ${localDate}.
      4. Ano atual: ${now.getFullYear()}.
      
      Retorne APENAS um JSON (sem markdown, sem \`\`\`) com o seguinte formato:
      {
        "title": "Título resumido da tarefa",
        "date": "YYYY-MM-DD",
        "time": "HH:mm",
        "type": "personal" ou "bill" (se parecer conta a pagar, use bill)
      }
      
      Se não identificar horário, use 09:00.
    `;

        try {
            console.log("Tentando modelo: gemini-flash-latest");

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                // console.error(`Erro da API Gemini (${response.status}):`, errorText);
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) return null;

            const resultText = data.candidates[0].content.parts[0].text;
            const jsonString = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Erro no aiService:", error);
            return null;
        }
    },
};
