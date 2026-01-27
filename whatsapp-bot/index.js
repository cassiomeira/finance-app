
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// const pdf = require('pdf-parse'); // Disabled for Hugging Face stability
import express from 'express';
import cors from 'cors';
import multer from 'multer';

dotenv.config();
dotenv.config({ path: '.env.local' });

// --- API SERVER SETUP (For Frontend "Magic Read" & QR) ---
const app = express();
// Hugging Face Spaces exposes PORT env var (usually 7860)
const port = process.env.PORT || 3005;
const upload = multer({ storage: multer.memoryStorage() });

// Global State for Bot Status
let latestQr = null;
let clientStatus = 'initializing'; // initializing, scan_qr, ready, disconnected

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({
        status: clientStatus,
        qr: latestQr
    });
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        console.log("⚡ API: Analyzing receipt...");
        // Construct media object compatible with extractReceiptData
        const media = {
            mimetype: req.file.mimetype,
            data: req.file.buffer.toString('base64')
        };

        const data = await extractReceiptData(media, null);
        res.json(data); // extractReceiptData will now throw if it fails
    } catch (e) {
        console.error("API Error Detailed:", e);
        res.status(500).json({ error: e.message || "Unknown Error" });
    }
});

app.listen(port, () => {
    console.log(`🚀 API do Bot rodando na porta ${port}`);
});

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openaiKey = process.env.OPENAI_KEY ? process.env.OPENAI_KEY.trim() : null;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error("❌ Erro: Crie um arquivo .env na pasta whatsapp-bot com SUPABASE_URL, SUPABASE_KEY e OPENAI_KEY");
    process.exit(1);
}

// Initialize Services
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Whitelist Logic ---
const WHITELIST_FILE = path.join(process.cwd(), 'whitelist.json');

function loadWhitelist() {
    if (!fs.existsSync(WHITELIST_FILE)) return [];
    try {
        const data = fs.readFileSync(WHITELIST_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Erro ao ler whitelist:", e);
        return [];
    }
}

function saveWhitelist(list) {
    try {
        fs.writeFileSync(WHITELIST_FILE, JSON.stringify(list, null, 2));
    } catch (e) {
        console.error("Erro ao salvar whitelist:", e);
    }
}

// Initialize WhatsApp Client
console.log("🐛 DEBUG: PUPPETEER_EXECUTABLE_PATH =", process.env.PUPPETEER_EXECUTABLE_PATH);

// Network Health Check
(async () => {
    try {
        console.log("🌐 Testando conectividade de rede...");
        const res = await fetch("https://google.com");
        console.log(`✅ Rede OK! Status Google: ${res.status}`);
    } catch (e) {
        console.error("❌ ERRO GRAVE DE REDE: O container não tem acesso à internet!", e);
    }
})();

const isWindows = process.platform === 'win32';
console.log(`🖥️ Sistema detectado: ${process.platform} (${isWindows ? 'Windows' : 'Linux/Other'})`);

const puppeteerConfig = isWindows
    ? {
        // Configuração Windows (Local)
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
    : {
        // Configuração Linux (Docker/Cloud)
        headless: true,
        ignoreHTTPSErrors: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // CRÍTICO: Causa erro no Windows, necessário no Linux
            '--disable-gpu',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--mute-audio',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-features=Translate,TranslateUI,site-per-process,IsolateOrigins',
            '--disable-site-isolation-trials',
            '--disable-web-security',
            '--dns-prefetch-disable',
            '--disable-ipv6',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-notifications',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--safebrowsing-disable-auto-update',
            '--password-store=basic',
            '--use-mock-keychain',
            '--proxy-server="direct://"',
            '--proxy-bypass-list=*',
            '--dns-server=8.8.8.8,1.1.1.1'
        ]
    };

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig,
    webVersionCache: { type: 'none' }
});
// Initialize WhatsApp Client already declared above
// Client initialization was duplicated in previous step, removing it here.

// --- HELPER: SEND PURCHASE NOTIFICATION ---
async function sendPurchaseNotification(data, chatIdOverwrite = null) {
    if (!data.requester && !chatIdOverwrite) return;

    const chatId = chatIdOverwrite || data.requester;
    let message = '';

    // Message Templates
    if (data.status === 'waiting') {
        message = `🚚 *ATUALIZAÇÃO DE COMPRA #${data.friendly_id || '?'}*
📦 *Item:* ${data.item}
🏢 *Comprador:* ${data.client}
🏪 *Fornecedor:* ${data.supplier || 'Não informado'}
🔢 *Qtd:* ${data.quantity || 1}
💲 *Valor:* R$ ${data.amount ? data.amount.toFixed(2) : '0,00'}

✅ *COMPRA EFETUADA!* 
Estamos aguardando a chegada. Avisaremos aqui!`;
    } else if (data.status === 'completed') {
        message = `✅ *ENTREGA CONFIRMADA #${data.friendly_id || '?'}*
📦 *Item:* ${data.item}
🏢 *Comprador:* ${data.client}
🏪 *Fornecedor:* ${data.supplier || 'Não informado'}

🔢 *Recebido:* ${data.received_quantity || data.quantity || '?'} / ${data.quantity || '?'}
${data.observation ? `📝 *Obs:* _"${data.observation}"_` : ''}

O produto já chegou e está disponível! 🚀`;
    }

    if (message) {
        try {
            let media = null;
            // 1. Download Media if exists
            if (data.receipt_url) {
                try {
                    console.log('Baixando comprovante:', data.receipt_url);
                    media = await MessageMedia.fromUrl(data.receipt_url);
                } catch (e) {
                    console.error("Erro baixando media:", e);
                }
            }

            // 2. Send Message
            if (media) {
                await client.sendMessage(chatId, media, { caption: message });
            } else {
                await client.sendMessage(chatId, message);
            }
            console.log(`✅ Notificação enviada para ${chatId}`);

            // 3. Create Transaction (Only if status changed to waiting and verified data)
            // THIS SHOULD ONLY RUN ON STATUS CHANGE, NOT ON RESEND
            // logic moved to caller
        } catch (e) {
            console.error("Erro enviando notificação:", e);
        }
    }
}

// --- BATCH NOTIFICATION CACHE ---
const batchCache = {}; // { batchId: { timer: Timeout, items: [] } }

async function processBatch(batchId) {
    if (!batchCache[batchId]) return;

    const { items } = batchCache[batchId];
    delete batchCache[batchId]; // Clear cache immediately to prevent double sends

    if (items.length === 0) return;

    // Sort by friendly_id
    items.sort((a, b) => (a.friendly_id || 0) - (b.friendly_id || 0));

    const firstItem = items[0];
    const chatId = firstItem.requester || process.env.WHATSAPP_GROUP_ID;

    // Determine Type (Buy or Receive) based on first item status
    const isWaiting = firstItem.status === 'waiting';
    const isCompleted = firstItem.status === 'completed';

    let message = '';
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

    if (isWaiting) {
        message = `🚚 *ATUALIZAÇÃO DE PEDIDO (LOTE)*
📦 *Itens Comprados:*
${items.map(item => `- ${item.quantity || 1}x ${item.item} (#${item.friendly_id})`).join('\n')}

🏢 *Comprador:* ${firstItem.client}
🏪 *Fornecedor:* ${firstItem.supplier || 'Múltiplos'}
💰 *Total do Lote:* R$ ${totalAmount.toFixed(2)}

✅ *COMPRA EFETUADA!* 
Estamos aguardando a chegada. Avisaremos aqui!`;
    } else if (isCompleted) {
        message = `✅ *ENTREGA CONFIRMADA (LOTE)*
📦 *Itens Recebidos:*
${items.map(item => `- ${item.item} (${item.received_quantity || item.quantity}/${item.quantity})`).join('\n')}

${items.some(i => i.observation) ? `📝 *Obs:* Verifique detalhes no sistema.` : ''}

Todos os produtos deste lote chegaram! 🚀`;
    }

    if (message && chatId) {
        try {
            // Use receipt from the first item (assuming batch shares receipt)
            const receiptUrl = firstItem.receipt_url;
            if (receiptUrl) {
                const media = await MessageMedia.fromUrl(receiptUrl);
                await client.sendMessage(chatId, media, { caption: message });
            } else {
                await client.sendMessage(chatId, message);
            }
            console.log(`✅ Notificação em LOTE enviada para ${chatId} (${items.length} itens)`);
        } catch (e) {
            console.error("Erro enviando lote:", e);
        }
    }
}

// --- REALTIME LISTENER ---
supabase
    .channel('schema-db-changes')
    .on(
        'postgres_changes',
        {
            event: 'UPDATE',
            schema: 'public',
            table: 'purchases',
        },
        async (payload) => {
            console.log('Realtime Update:', payload);
            const newData = payload.new;
            const oldData = payload.old;

            // Trigger 1: Status Changed
            const statusChanged = newData.status !== oldData.status;

            // Trigger 2: Manual Notification Request (timestamp changed)
            const manualTrigger = newData.last_notification_request !== oldData.last_notification_request;

            if ((statusChanged || manualTrigger) && newData.requester) {

                // BATCH LOGIC
                if (newData.batch_id) {
                    console.log(`📦 Item de Lote detectado: ${newData.item} (Batch: ${newData.batch_id})`);

                    if (!batchCache[newData.batch_id]) {
                        batchCache[newData.batch_id] = {
                            items: [],
                            timer: setTimeout(() => processBatch(newData.batch_id), 4000) // Wait 4 seconds for all items
                        };
                    } else {
                        // Reset timer if new item comes in (debounce)
                        clearTimeout(batchCache[newData.batch_id].timer);
                        batchCache[newData.batch_id].timer = setTimeout(() => processBatch(newData.batch_id), 4000);
                    }

                    // Avoid duplicates
                    if (!batchCache[newData.batch_id].items.find(i => i.id === newData.id)) {
                        batchCache[newData.batch_id].items.push(newData);
                    }
                } else {
                    // LEGACY / SINGLE ITEM LOGIC
                    await sendPurchaseNotification(newData);
                }

                // Transaction Creation Logic (ONLY ON STATUS CHANGE TO WAITING)
                if (statusChanged && newData.status === 'waiting') {
                    try {
                        const installments = newData.installments || 1;
                        const amount = newData.amount;
                        const buyDate = new Date(newData.purchase_date || new Date());
                        const categoryId = '50e051dd-444f-47dc-9a91-4d7690a2be29'; // Default/Outros

                        console.log(`💸 Criando transação baseada no pedido (Verified): ${amount} em ${installments}x`);

                        for (let i = 0; i < installments; i++) {
                            const dueDate = new Date(buyDate);
                            dueDate.setMonth(buyDate.getMonth() + i);

                            const amountPerInst = amount / installments;

                            await supabase.from('transactions').insert({
                                type: 'expense',
                                amount: amountPerInst,
                                description: `${newData.item} (${i + 1}/${installments}) #${newData.friendly_id}`,
                                date: dueDate.toISOString().split('T')[0],
                                category_id: categoryId,
                                payment_method: 'credit',
                                status: 'paid',
                                user_id: process.env.USER_ID,
                                purchase_id: newData.id
                            });
                        }
                    } catch (txError) {
                        console.error("Erro criando transação:", txError);
                    }
                }
            }
        }
    )
    .subscribe();

// --- AI RECEIPT EXTRACTION ---
async function extractReceiptData(media, knownAmount) {
    try {
        let textPrompt = "";
        let imagePart = null;

        if (media.mimetype === 'application/pdf') {
            const buffer = Buffer.from(media.data, 'base64');
            const pdfData = await pdf(buffer);
            textPrompt = `Texto do PDF: ${pdfData.text.slice(0, 5000)}`; // Increased limit to capture footer/installments
        } else if (media.mimetype.startsWith('image/')) {
            imagePart = { type: "image_url", image_url: { url: `data:${media.mimetype};base64,${media.data}` } };
        } else {
            return null; // Unsupported format
        }

        const systemPrompt = `Você é um especialista contábil. Analise este comprovante/fatura com atenção aos detalhes.
        
        OBJETIVO: Extrair dados precisos para lançamento financeiro.

        REGRAS:
        1. **Fornecedor (supplier):** Nome da empresa vendedora (quem emitiu a nota).
           - GERALMENTE está no TOPO ou no LOGO.
           - Atenção: NÃO pegue o nome do cliente (ex: Suprinet). Pegue quem VENDEU.
        2. **Produto (item):** 
           - Se for UM item: descrição completa.
           - Se forem VÁRIOS itens: Liste-os separados por vírgula (ex: "Cabo, Conector e Mouse") ou "Vários: [Principal] + [Qtd] outros".
        3. **Quantidade (quantity):** 
           - SOMA total de unidades de todos os itens.
           - Procure por colunas "Qtde", "Qtd". Se não achar, conte as linhas de itens.

        4. **Frete (freight):** Valor do frete/entrega explícito. Se zero, retorne 0.
        
        5. **Valor Total (amount):** SOMA FINAL (Produtos + Frete + IPI).
           - Exemplo: 1795 (Prod) + 35 (Frete) = 1830. Retorne 1830.
        
        6. **Parcelas (installments):** Conte os vencimentos.
        7. **Data (date):** Emissão (YYYY-MM-DD).

        RESPOSTA JSON APENAS:
        { 
            "supplier": "Nome da Loja",
            "item": "Produto X", 
            "quantity": 500,
            "amount": 1830.00, 
            "freight": 35.00,
            "installments": 3,
            "date": "2026-01-20"
        }`;

        const messages = [
            { role: "system", content: systemPrompt }
        ];

        if (textPrompt) {
            messages.push({ role: "user", content: textPrompt });
        }
        if (imagePart) {
            messages.push({ role: "user", content: [imagePart] });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: messages,
                max_tokens: 300
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());

    } catch (e) {
        console.error("Erro AI Extraction:", e);
        throw new Error(e.message || "Falha na análise IA");
    }
}

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📌 Escaneie o QR Code acima com seu WhatsApp!');
});

client.on('ready', async () => {
    console.log('✅ Tudo pronto! Bot Financeiro conectado e ouvindo...');

    // PATCH: Disable sendSeen to prevent crashing on recent WhatsApp versions
    try {
        await client.pupPage.evaluate(() => {
            window.WWebJS.sendSeen = async () => true;
        });
        console.log('🔧 Patch aplicado: sendSeen desativado.');
    } catch (e) {
        console.log('⚠️ Falha ao aplicar patch (pode ser ignorado se funcionar):', e.message);
    }
});

// Helper to call OpenAI via REST API
// Helper to call OpenAI via REST API
async function askOpenAI(text) {
    const prompt = `
        Analise esta mensagem de chat informal e extraia os dados financeiros/tarefa ou a intenção de consulta.
        Mensagem: "${text}"
        
        Data Hoje: ${new Date().toLocaleDateString('pt-BR')}
        
        Intenções (intent):
        - add_transaction: Adicionar uma despesa, conta ou receita.
        - add_reminder: Adicionar um lembrete ou tarefa.
        - get_balance: Consultar saldo, resumo do mês, quanto gastei.
        - get_bills: Consultar contas a pagar, o que vence, boletos pendentes.
        - get_reminders: Consultar lembretes, compromissos, agenda do dia.
        - get_debt: Consultar dívida de cartão, fatura atual.
        - request_purchase: Pedido de compra de material/equipamento.

        Regras:
        - Para "request_purchase": OBRIGATÓRIO identificar o cliente/empresa (ex: "para Masternet"). Se não tiver, marque "client" como "Geral".
        - Para CONSULTAS (get_reminders, get_bills): Se o usuário disser "amanhã", defina "date" como data de amanhã. Se "hoje" ou não especificar, use data de hoje.
        - Se for despesa futura, status="pending". Se passado/hoje, status="paid".
        - Se mencionar "cartão", payment_method="credit".
        
        Retorne APENAS JSON (sem markdown):
        {
            "intent": "add_transaction" | "add_reminder" | "get_balance" | "get_bills" | "get_reminders" | "get_debt" | "request_purchase",
            "title": "Nome COMPLETO do item (se for solicitação de compra, inclua TODOS os detalhes mencionados)",
            "client": "Nome da Empresa (ex: Masternet)",
            "amount": 0.00,
            "type": "expense" | "income" | "task",
            "date": "YYYY-MM-DD",
            "payment_method": "cash" | "credit" | "debit" | "pix",
            "status": "paid" | "pending",
            "category_guess": "Categoria estimada"
        }
    `;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Você é um assistente financeiro." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("❌ Erro da API OpenAI:", JSON.stringify(data.error, null, 2));
            throw new Error(`Erro API: ${data.error.message}`);
        }

        const content = data.choices[0].message.content;
        const jsonText = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Erro na IA:", error);
        return null;
    }
}

// --- Analytics Helper Functions ---

async function getUpcomingBills() {
    // FIX: Get Adjusted Date for Brazil (UTC-3)
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    const { data: bills, error } = await supabase
        .from('transactions')
        .select('date, description, amount')
        .eq('user_id', process.env.USER_ID)
        .eq('type', 'expense')
        .or(`status.eq.pending,date.gt.${today}`) // Pending OR Future
        .order('date', { ascending: true })
        .limit(10);

    if (error) {
        console.error('Erro getBills', error);
        return "❌ Erro ao buscar contas.";
    }
    if (!bills || bills.length === 0) return "✅ Nenhuma conta pendente próxima!";

    return "*📅 Contas a Pagar (Próximas):*\n" + bills.map(b => `▫️ ${new Date(b.date).toLocaleDateString('pt-BR').slice(0, 5)} - ${b.description}: R$ ${b.amount.toFixed(2)}`).join('\n');
}

async function getDayReminders(targetDate) {
    // FIX: Get Adjusted Date for Brazil (UTC-3) if not provided
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    const dateToQuery = targetDate || today;

    const { data: reminders, error } = await supabase
        .from('reminders')
        .select('title, date') // Removed 'time'
        .eq('user_id', process.env.USER_ID)
        .gte('date', `${dateToQuery} 00:00:00`)
        .lte('date', `${dateToQuery} 23:59:59`)
        .order('date', { ascending: true });

    if (error) {
        console.error('Erro getReminders', error);
        return "❌ Erro ao buscar lembretes.";
    }

    // Format date for display
    const dateDisplay = dateToQuery === today ? 'Hoje' : new Date(dateToQuery).toLocaleDateString('pt-BR');

    if (!reminders || reminders.length === 0) return `✅ Nenhum compromisso para ${dateDisplay}!`;

    return `*📝 Compromissos (${dateDisplay}):*\n` + reminders.map(r => `▫️ ${new Date(r.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${r.title}`).join('\n');
}

async function getFinancialReport() {
    const today = new Date();
    // FIX: Adjust start/end of month using Local Time, not UTC
    const year = today.getFullYear();
    const month = today.getMonth();
    const startOfMonth = new Date(year, month, 1).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');

    // For end of month, we just need the date string, let's simplify query to use string comparisons if possible or ensure date object is correct.
    // Actually, Supabase handles ISO strings. Let's construct ISO for start/end of month in UTC but based on Local Year/Month.
    // Safest: Use First and Last day formatted as YYYY-MM-DD
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    console.log(`Relatório: ${startOfMonth} até ${endOfMonth}`);

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', process.env.USER_ID)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

    if (error) return "❌ Erro ao gerar relatório.";

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expense += t.amount;
    });

    const balance = income - expense;
    const monthName = today.toLocaleDateString('pt-BR', { month: 'long' });

    return `📊 *Resumo de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}*
💰 Receita: R$ ${income.toFixed(2)}
💸 Despesa: R$ ${expense.toFixed(2)}
⚖️ *Saldo: R$ ${balance.toFixed(2)}*`;
}

async function getCreditCardDebt() {
    // Estimativa baseada em gastos 'credit' deste mês
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', process.env.USER_ID)
        .eq('payment_method', 'credit')
        .gte('date', startOfMonth);

    if (error) return "❌ Erro ao calcular gastos de cartão.";

    const total = transactions ? transactions.reduce((acc, t) => acc + t.amount, 0) : 0;
    return `💳 *Gastos no Cartão (Este Mês):*
R$ ${total.toFixed(2)}
_(Somatório de lançamentos Crédito)_`;
}

// Helper to transcribe audio using OpenAI Whisper
async function transcribeAudio(media) {
    try {
        const buffer = Buffer.from(media.data, 'base64');
        const blob = new Blob([buffer], { type: media.mimetype });

        const formData = new FormData();
        formData.append('file', blob, 'audio.ogg');
        formData.append('model', 'whisper-1');

        console.log("🎤 Transcrevendo áudio...");
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.text;
    } catch (error) {
        console.error("Erro no Whisper:", error);
        return null;
    }
}

// Helper to analyze image using OpenAI Vision
async function analyzeImage(media) {
    const prompt = `
        Analise esta imagem (recibo, nota fiscal ou anotação) e extraia os dados.
        Data Hoje: ${new Date().toLocaleDateString('pt-BR')}
        Retorne APENAS JSON (sem markdown):
        {
            "title": "Titulo curto",
            "amount": 0.00,
            "type": "expense",
            "date": "YYYY-MM-DD",
            "category_guess": "Categoria"
        }
    `;

    try {
        console.log("📸 Analisando imagem...");
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:${media.mimetype};base64,${media.data}` } }
                        ]
                    }
                ],
                max_tokens: 300
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const content = data.choices[0].message.content;
        return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (error) {
        console.error("Erro no Vision:", error);
        return null;
    }
}

client.on('message_create', async (msg) => {
    // Ignore status updates
    if (msg.from === 'status@broadcast') return;

    // Stops infinite loop: Ignore my own messages
    if (msg.fromMe) return;

    let text = msg.body;

    // --- WHITELIST CHECK ---
    const whitelist = loadWhitelist();
    const sender = msg.from;

    // Command: #ativar
    if (text.trim().toLowerCase() === '#ativar') {
        if (!whitelist.includes(sender)) {
            whitelist.push(sender);
            saveWhitelist(whitelist);
            await msg.reply("✅ Bot ativado neste chat!");
            console.log(`🔓 Chat liberado: ${sender}`);
        } else {
            await msg.reply("⚠️ Bot já estava ativo.");
        }
        return;
    }

    // Command: #desativar
    if (text.trim().toLowerCase() === '#desativar') {
        const index = whitelist.indexOf(sender);
        if (index > -1) {
            whitelist.splice(index, 1);
            saveWhitelist(whitelist);
            await msg.reply("🚫 Bot desativado.");
            console.log(`🔒 Chat bloqueado: ${sender}`);
        } else {
            await msg.reply("⚠️ Bot já estava inativo.");
        }
        return;
    }

    // Command: #comprar (Direct Purchase Trigger)
    // Allows purchasing without #ativar
    let isDirectCommand = false;
    if (text.trim().toLowerCase().startsWith('#comprar')) {
        isDirectCommand = true;
        // Replace #comprar with "Comprar" to ensure AI understands the intent
        text = text.replace(/^#comprar/i, 'Comprar').trim();
        console.log(`🛒 Comando direto de compra detectado: ${text}`);
    }

    // If NOT in whitelist AND NOT a direct command, ignore
    if (!whitelist.includes(sender) && !isDirectCommand) {
        // console.log(`Ignorando mensagem de ${sender} (Não autorizado)`);
        return;
    }

    // Command: #reenviar <ID>
    if (text.trim().toLowerCase().startsWith('#reenviar')) {
        const idPart = text.split(' ')[1];
        if (!idPart) {
            await msg.reply("❌ Use: #reenviar <ID> (Ex: #reenviar 10)");
            return;
        }

        const friendlyId = parseInt(idPart.replace('#', ''));
        console.log(`🔄 Solicitado reenvio para compra #${friendlyId}`);

        const { data: purchase, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('friendly_id', friendlyId)
            .single();

        if (error || !purchase) {
            await msg.reply(`❌ Compra #${friendlyId} não encontrada.`);
            return;
        }

        await msg.reply("🔄 Reenviando notificação...");
        await sendPurchaseNotification(purchase, msg.from); // Force send to requester
        return;
    }

    let data = null;

    // Trigger Logic for Text
    // Trigger Logic: Allow ANY text message to be processed by AI.
    // The AI will decide if it's a valid expense/task.
    // We only filter out very short messages to avoid noise.
    const isTextCommand = text.trim().length > 2;

    // Handle Media (Audio or Image)
    if (msg.hasMedia) {
        console.log(`📎 Mídia recebida de ${msg.from}`);
        await msg.react('👀');

        try {
            const media = await msg.downloadMedia();

            if (msg.type === 'ptt' || msg.type === 'audio') {
                await msg.react('👂');
                const transcribed = await transcribeAudio(media);
                if (transcribed) {
                    console.log(`🗣️ Transcrição: "${transcribed}"`);
                    text = transcribed; // Treat as text command
                    // Force command processing for audio
                    if (!isTextCommand) {
                        // Auto-process audio even without keywords if it looks like a request? 
                        // For safety, let's assume all audio sent to bot is actionable
                    }
                } else {
                    await msg.reply("❌ Não consegui ouvir o áudio.");
                    return;
                }
            } else if (msg.type === 'image') {
                await msg.react('🔍');
                data = await analyzeImage(media);
                if (!data) {
                    await msg.reply("❌ Não consegui ler a imagem.");
                    return;
                }
            }
        } catch (e) {
            console.error("Erro baixando mídia:", e);
            return;
        }
    }

    // If we have extracted data from Image, OR we have Text (original or transcribed)
    const shouldProcess = isTextCommand || msg.hasMedia; // Simplified trigger

    if (shouldProcess) {
        console.log(`🤖 Processando: "${text}"`);
        try { await msg.react('⏳'); } catch (e) { console.log('Erro na reação (ignorado):', e.message); }

        if (!data) {
            // If data wasn't already parsed (like from Image), parse text now
            data = await askOpenAI(text);
        }

        if (!data) {
            await msg.reply("❌ Erro ao processar IA.");
            return;
        }

        console.log("🧠 IA Entendeu:", data);

        try {
            // --- HANDLERS DE LEITURA (CONSULTAS) ---
            if (data.intent === 'get_bills') {
                const report = await getUpcomingBills();
                await client.sendMessage(msg.from, report);
                return;
            }
            if (data.intent === 'get_reminders') {
                // Pass the date extracted by AI (or null, which defaults to today)
                const report = await getDayReminders(data.date);
                await client.sendMessage(msg.from, report);
                return;
            }
            if (data.intent === 'get_balance') {
                const report = await getFinancialReport();
                await client.sendMessage(msg.from, report);
                return;
            }
            if (data.intent === 'get_debt') {
                const report = await getCreditCardDebt();
                await client.sendMessage(msg.from, report);
                return;
            }

            // --- HANDLERS DE ESCRITA (CRIAÇÃO) ---

            // 0. Purchase Request
            if (data.intent === 'request_purchase') {
                console.log("🛒 Detectado SOLICITAÇÃO DE COMPRA");
                const item = data.title;
                const clientName = data.client || 'Geral';

                const { data: insertedData, error } = await supabase.from('purchases').insert({
                    item: item,
                    client: clientName,
                    requester: msg.from, // SAVE FULL ID (e.g. 12345@g.us) for replies
                    status: 'pending',
                    user_id: process.env.USER_ID // Link to main user
                }).select().single();

                if (error) {
                    console.error("Erro Purchase:", error);
                    await client.sendMessage(msg.from, "❌ Erro ao salvar pedido.");
                } else {
                    await client.sendMessage(msg.from, `🛒 *Pedido Criado! #${insertedData?.friendly_id || '?'}*
📦 *Item:* ${item}
🏢 *Empresa:* ${clientName}
📌 *Status:* A Comprar`);
                }
                return;
            }

            const isExpense = data.intent === 'add_transaction' || data.type === 'expense';
            const isReminder = data.intent === 'add_reminder' || data.type === 'task';

            // 2. Save to Supabase
            if (isExpense && data.amount > 0) {
                console.log("💰 Detectado como DESPESA via OpenAI");

                // Debug: Verify User ID and Key
                console.log(`👤 User ID: ${process.env.USER_ID}`);

                // Fetch 'Outros' category or first available
                console.log("🔍 Buscando categoria...");
                const { data: categories, error: catError } = await supabase.from('categories').select('id, name').limit(1);

                if (catError) {
                    console.error("❌ Erro buscando categorias:", catError);
                }

                const categoryId = categories && categories[0] ? categories[0].id : null;
                console.log(`📂 Categoria encontrada: ${categoryId ? categories[0].name : 'NENHUMA'}`);

                if (categoryId) {
                    console.log("💾 Tentando inserir transação no Supabase...");
                    const payload = {
                        type: 'expense', // TODO: Support 'income' if logic permits
                        amount: data.amount,
                        description: data.title + (msg.author ? ` (via Zap)` : ''),
                        date: data.date,
                        category_id: categoryId,
                        payment_method: data.payment_method || 'cash',
                        status: data.status || 'paid',
                        user_id: process.env.USER_ID
                    };
                    console.log("📦 Payload:", JSON.stringify(payload));

                    const { error } = await supabase.from('transactions').insert(payload);

                    if (error) {
                        console.error("❌ Erro no INSERT Transactions:", error);
                        throw error;
                    }
                    console.log("✅ Sucesso no Insert!");

                    const responseText = `✅ *Despesa Salva!*
🏷️ *Título:* ${data.title}
💰 *Valor:* R$ ${data.amount}
📅 *Data:* ${data.date}
📂 *Categoria:* ${categoryId ? categories[0].name : 'Padrão'}
💳 *Método:* ${payload.payment_method}
📌 *Status:* ${payload.status === 'paid' ? 'Pago' : 'Pendente'}
_Se estiver errado, edite no App ou mande um áudio corrigindo._`;

                    await client.sendMessage(msg.from, responseText);
                } else {
                    console.log("⚠️ Nenhuma categoria disponível para associar.");
                    await client.sendMessage(msg.from, `❌ Erro: Nenhuma categoria encontrada no banco.`);
                }
            } else {
                // Insert into Reminders
                let userId = process.env.USER_ID;
                if (!userId) {
                    console.error("❌ USER_ID missing");
                    return;
                }

                console.log(`💾 Salvando lembrete...`);
                const { error } = await supabase.from('reminders').insert({
                    title: data.title,
                    date: `${data.date} 09:00:00`,
                    type: 'personal',
                    user_id: userId,
                    is_completed: false
                });

                if (error) {
                    console.error("Erro Supabase:", error);
                } else {
                    console.log("✅ Salvo!");
                    try {
                        // Detailed feedback for Reminders
                        const responseText = `✅ *Lembrete Criado!*
📝 *Nota:* ${data.title}
📅 *Data:* ${data.date}

_Use o App para ver detalhes._`;
                        await client.sendMessage(msg.from, responseText);
                    } catch (replyError) {
                        console.error("Erro reply:", replyError.message);
                    }
                }
            }
        } catch (dbError) {
            console.error("Erro Banco:", dbError);
            await client.sendMessage(msg.from, "❌ Erro ao salvar no banco.");
        }
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
    latestQr = qr;
    clientStatus = 'scan_qr';
});

client.on('ready', () => {
    console.log('Client is ready!');
    latestQr = null;
    clientStatus = 'ready';
});

client.on('authenticated', () => {
    console.log('Client is authenticated!');
    latestQr = null;
    clientStatus = 'authenticated';
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    latestQr = null;
    clientStatus = 'disconnected';
});

client.initialize();
