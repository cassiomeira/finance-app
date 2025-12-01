import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ainightysplbdfrmksub.supabase.co"
const supabaseKey = "sb_publishable_uMJqQ2rMZhzraQP97GE-wA_j2CPSu9a"

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log("Verificando schema da tabela credit_cards...")

    // Tentar inserir um registro dummy para ver o erro detalhado ou sucesso
    // Mas antes, vamos tentar listar as colunas se tivermos permissão (geralmente não tem em public)

    // Vamos tentar um insert falho propositalmente para ver se o erro nos diz as colunas
    // Ou melhor, vamos tentar selecionar APENAS 'id' e 'name' que devem existir.

    const { data, error } = await supabase
        .from('credit_cards')
        .select('id, name')
        .limit(1)

    if (error) {
        console.log("Erro ao selecionar id, name:", error.message)
        // Se der erro aqui, a tabela pode não existir
    } else {
        console.log("Tabela existe! Sucesso ao selecionar id, name.")
    }

    // Agora vamos tentar selecionar 'card_limit'
    const { error: limitError } = await supabase
        .from('credit_cards')
        .select('card_limit')
        .limit(1)

    if (limitError) {
        console.log("Coluna 'card_limit' NÃO existe ou erro:", limitError.message)
    } else {
        console.log("Coluna 'card_limit' EXISTE.")
    }
}

checkSchema()
