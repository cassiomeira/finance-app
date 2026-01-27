-- Adiciona coluna batch_id para agrupar compras em lote
ALTER TABLE purchases 
ADD COLUMN batch_id UUID;

-- Comentário para documentação
COMMENT ON COLUMN purchases.batch_id IS 'ID único gerado pelo frontend para agrupar múltiplos itens em uma única ação (compra/recebimento)';
