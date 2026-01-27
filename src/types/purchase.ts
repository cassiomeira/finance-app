export interface Purchase {
    id: string;
    created_at: string;
    item: string;
    client: string;
    requester: string;
    status: 'pending' | 'waiting' | 'completed';
    quantity?: number;
    amount?: number;
    receipt_url?: string;
    user_id: string;
    friendly_id?: number;
    received_quantity?: number;
    observation?: string;
    installments?: number;
    purchase_date?: string;
    freight?: number;
    supplier?: string;
    batch_id?: string;
}
