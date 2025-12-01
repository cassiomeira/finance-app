import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { image, text, apiKey } = await req.json()

        if (!apiKey) {
            throw new Error('API Key not provided')
        }

        let prompt = `
      You are a financial assistant. Analyze the input and extract transaction data.
      Return ONLY a JSON object with this structure:
      {
        "amount": number (use 0 if not found),
        "description": string (brief description),
        "date": string (YYYY-MM-DD, use today if not found),
        "category_id": string (guess one of: food, transport, housing, utilities, health, leisure, education, shopping, salary, freelance, investment, other),
        "type": "expense" | "income"
      }
    `

        let contents = []

        if (image) {
            // Image input (base64)
            // Remove header if present (data:image/jpeg;base64,...)
            const base64Image = image.split(',')[1] || image;

            contents = [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }]
        } else if (text) {
            // Text input
            contents = [{
                parts: [
                    { text: prompt + `\nInput text: "${text}"` }
                ]
            }]
        } else {
            throw new Error('No image or text provided')
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contents }),
            }
        )

        const data = await response.json()

        if (data.error) {
            throw new Error(data.error.message)
        }

        const rawText = data.candidates[0].content.parts[0].text
        // Clean markdown code blocks if present
        const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
        const result = JSON.parse(jsonText)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
