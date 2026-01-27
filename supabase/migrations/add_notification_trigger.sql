-- Adiciona coluna para controlar reenvio de notificações
ALTER TABLE purchases 
ADD COLUMN last_notification_request TIMESTAMPTZ;

-- Comentário para documentação
COMMENT ON COLUMN purchases.last_notification_request IS 'Data/hora da última solicitação manual de reenvio de notificação';
