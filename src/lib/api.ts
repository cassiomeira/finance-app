/**
 * Cliente de API - comunicação com o backend Express.js/PostgreSQL
 * Todas as chamadas ao backend próprio passam por aqui.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  try {
    const session = localStorage.getItem('finance_session');
    if (!session) return null;
    const parsed = JSON.parse(session);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

function saveSession(session: { access_token: string; token_type: string }) {
  localStorage.setItem('finance_session', JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem('finance_session');
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/auth';
    throw new Error('Sessão expirada');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }

  return data as T;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    signUp: async (email: string, password: string, name: string) => {
      const data = await request('POST', '/auth/signup', { email, password, name }, false);
      if (data.session) saveSession(data.session);
      return { data, error: null };
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const data = await request('POST', '/auth/signin', { email, password }, false);
        if (data.session) saveSession(data.session);
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signOut: async () => {
      try {
        await request('POST', '/auth/signout');
      } finally {
        clearSession();
      }
      return { error: null };
    },
    getUser: async () => {
      try {
        const data = await request('GET', '/auth/user');
        return { data, error: null };
      } catch {
        return { data: { user: null }, error: null };
      }
    },
    getSession: async () => {
      const token = getToken();
      if (!token) return { data: { session: null }, error: null };
      try {
        const data = await request('GET', '/auth/user');
        return { data: { session: { access_token: token, user: data.user } }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Verifica sessão atual imediatamente
      const token = getToken();
      if (token) {
        request('GET', '/auth/user').then(data => {
          callback('SIGNED_IN', { access_token: token, user: data.user });
        }).catch(() => {
          clearSession();
          callback('SIGNED_OUT', null);
        });
      } else {
        setTimeout(() => callback('SIGNED_OUT', null), 0);
      }

      // Escuta eventos de storage (logout em outra aba)
      const handler = (e: StorageEvent) => {
        if (e.key === 'finance_session') {
          if (!e.newValue) callback('SIGNED_OUT', null);
        }
      };
      window.addEventListener('storage', handler);

      return {
        data: {
          subscription: {
            unsubscribe: () => window.removeEventListener('storage', handler)
          }
        }
      };
    }
  },

  // ─── PERFIL ───────────────────────────────────────────────────────────────
  profiles: {
    get: () => request('GET', '/profiles/me'),
    update: (updates: any) => request('PUT', '/profiles/me', updates),
    isAdmin: () => request('GET', '/profiles/is-admin'),
  },

  // ─── CATEGORIAS ───────────────────────────────────────────────────────────
  categories: {
    getAll: () => request('GET', '/categories'),
    create: (data: any) => request('POST', '/categories', data),
    update: (id: string, data: any) => request('PUT', `/categories/${id}`, data),
    delete: (id: string) => request('DELETE', `/categories/${id}`),
  },

  // ─── TRANSAÇÕES ───────────────────────────────────────────────────────────
  transactions: {
    getAll: (month?: number, year?: number) => {
      const params = new URLSearchParams();
      if (month) params.set('month', String(month));
      if (year) params.set('year', String(year));
      return request('GET', `/transactions?${params}`);
    },
    create: (data: any) => request('POST', '/transactions', data),
    update: (id: string, data: any) => request('PUT', `/transactions/${id}`, data),
    updateStatus: (id: string, status: 'paid' | 'pending') =>
      request('PATCH', `/transactions/${id}/status`, { status }),
    delete: (id: string) => request('DELETE', `/transactions/${id}`),
    deleteMonth: (month: number, year: number) =>
      request('DELETE', `/transactions/month/${month}/${year}`),
    deleteAll: () => request('DELETE', '/transactions/all/clear'),
    payInvoice: (cardId: string) => request('PATCH', `/transactions/pay-invoice/${cardId}`),
  },

  // ─── CARTÕES DE CRÉDITO ───────────────────────────────────────────────────
  creditCards: {
    getAll: () => request('GET', '/credit-cards'),
    create: (data: any) => request('POST', '/credit-cards', data),
    delete: (id: string) => request('DELETE', `/credit-cards/${id}`),
    getInvoices: (cardId: string) => request('GET', `/credit-cards/${cardId}/invoices`),
  },

  // ─── LEMBRETES ────────────────────────────────────────────────────────────
  reminders: {
    getAll: () => request('GET', '/reminders'),
    create: (data: any) => request('POST', '/reminders', data),
    update: (id: string, data: any) => request('PUT', `/reminders/${id}`, data),
    toggle: (id: string) => request('PATCH', `/reminders/${id}/toggle`),
    delete: (id: string) => request('DELETE', `/reminders/${id}`),
  },

  // ─── BUDGETS/METAS ────────────────────────────────────────────────────────
  budgets: {
    getAll: (month?: number, year?: number) => {
      const params = new URLSearchParams();
      if (month) params.set('month', String(month));
      if (year) params.set('year', String(year));
      return request('GET', `/budgets?${params}`);
    },
    save: (data: any) => request('POST', '/budgets', data),
    delete: (id: string) => request('DELETE', `/budgets/${id}`),
  },

  // ─── COMPRAS ──────────────────────────────────────────────────────────────
  purchases: {
    getAll: () => request('GET', '/purchases'),
    update: (id: string, data: any) => request('PUT', `/purchases/${id}`, data),
    delete: (id: string) => request('DELETE', `/purchases/${id}`),
    uploadReceipt: async (file: File) => {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/purchases/upload-receipt`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.url;
    },
  },

  // ─── EMPRÉSTIMOS ────────────────────────────────────────────────────────
  loans: {
    getAll: () => request('GET', '/loans'),
    create: (data: any) => request('POST', '/loans', data),
    update: (id: string, data: any) => request('PUT', `/loans/${id}`, data),
    delete: (id: string) => request('DELETE', `/loans/${id}`),
    toggleIntegration: (id: string, integrate: boolean) =>
      request('PATCH', `/loans/${id}/integration`, { integrate_in_dashboard: integrate }),
    createPayment: (loanId: string, data: any) =>
      request('POST', `/loans/${loanId}/payments`, data),
    batchPayments: (loanId: string, payments: any[]) =>
      request('POST', `/loans/${loanId}/payments/batch`, payments),
    deletePayments: (loanId: string) =>
      request('DELETE', `/loans/${loanId}/payments`),
    replacePayments: (loanId: string, payments: any[]) =>
      request('PUT', `/loans/${loanId}/payments/replace`, payments),
    syncTransactions: (loanId: string, transactions: any[]) =>
      request('POST', `/loans/${loanId}/sync-transactions`, { transactions }),
  },

  // ─── IA (proxy do backend — a chave do Gemini fica no servidor) ───────────
  ai: {
    gemini: (contents: any[]) => request('POST', '/ai/gemini', { contents }),
  },

  // ─── STRIPE ───────────────────────────────────────────────────────────────
  stripe: {
    createCheckout: (origin: string) => request('POST', '/stripe/create-checkout', { origin }),
    createPortalSession: (origin: string) => request('POST', '/stripe/create-portal-session', { origin }),
  },

  // ─── UPLOAD GENÉRICO ──────────────────────────────────────────────────────
  upload: async (file: File): Promise<string> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url;
  },
};

export default api;
