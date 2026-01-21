import { supabase } from "@/integrations/supabase/client";
import { Purchase } from "../types/purchase";

export const purchasesService = {
    // Get all purchases
    getAll: async (): Promise<Purchase[]> => {
        const { data, error } = await supabase
            .from('purchases' as any)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching purchases:', error);
            throw error;
        }
        return data as unknown as Purchase[];
    },

    // Update purchase (Register Buy / Mark Received)
    update: async (id: string, updates: Partial<Purchase>) => {
        const { data, error } = await supabase
            .from('purchases' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }
        return data as unknown as Purchase;
    },

    // Delete purchase
    delete: async (id: string) => {
        const { error } = await supabase
            .from('purchases' as any)
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }
    },

    // Upload Receipt to Storage
    uploadReceipt: async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
