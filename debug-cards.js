import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ainightysplbdfrmksub.supabase.co"
const supabaseKey = "sb_publishable_uMJqQ2rMZhzraQP97GE-wA_j2CPSu9a"

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCardInsert() {
    console.log("Tentando inserir cartão...")

    // 1. Tentar pegar um usuário para usar o ID (ou usar um ID fixo se soubermos)
    // Como não temos login aqui, vamos tentar listar cartões existentes para ver a estrutura
    const { data: cards, error: selectError } = await supabase.from('credit_cards').select('*').limit(1)

    if (selectError) {
        console.error("Erro ao selecionar cartões:", selectError)
    } else if (cards.length > 0) {
        console.log("Cartão encontrado. Chaves:", Object.keys(cards[0]))
    } else {
        console.log("Nenhum cartão encontrado para verificar schema.")
    }

    // Se não conseguirmos ver o schema pelo select, vamos tentar inferir pelo erro
}

testCardInsert()
