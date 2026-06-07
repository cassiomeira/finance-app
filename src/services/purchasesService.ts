import { api } from "@/lib/api";
import { Purchase } from "../types/purchase";

export const purchasesService = {
  getAll: async (): Promise<Purchase[]> => {
    const data = await api.purchases.getAll();
    return data as Purchase[];
  },

  update: async (id: string, updates: Partial<Purchase>) => {
    return await api.purchases.update(id, updates) as Purchase;
  },

  delete: async (id: string) => {
    await api.purchases.delete(id);
  },

  uploadReceipt: async (file: File): Promise<string> => {
    return await api.purchases.uploadReceipt(file);
  }
};
