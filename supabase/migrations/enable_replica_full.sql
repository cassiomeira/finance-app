-- Habilita REPLICA IDENTITY FULL para receber o registro antigo (old) completo no Realtime
-- Isso é necessário para que o bot saiba EXATAMENTE o que mudou (ex: diferenciar mudança de status de mudança de cliente)
ALTER TABLE purchases REPLICA IDENTITY FULL;
