import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ainightysplbdfrmksub.supabase.co"
const supabaseKey = "sb_publishable_uMJqQ2rMZhzraQP97GE-wA_j2CPSu9a"

console.log('Testando conexão com:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    try {
        // Tentar um select simples na tabela loans (mesmo vazia, deve retornar 200 OK)
        const { data, error } = await supabase.from('loans').select('count', { count: 'exact', head: true })

        if (error) {
            console.error('Erro Supabase:', error.message)
            console.error('Detalhes:', error)
        } else {
            console.log('Conexão BEM SUCEDIDA! Supabase respondeu.')
        }
    } catch (e) {
        console.error('Erro de rede/sistema:', e.message)
    }
}

test()
