export type LoanType = 'borrowed' | 'lent';
export type InterestType = 'compound' | 'fixed_installment'; // Composto ou Tabela Price
export type InterestPeriod = 'monthly' | 'yearly';
export type LoanStatus = 'active' | 'paid' | 'defaulted';

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: Date;
  note?: string;
}

export interface LoanInstallment {
  number: number;
  dueDate: Date;
  amount: number;
  interestAmount: number; // Quanto da parcela é juros
  principalAmount: number; // Quanto da parcela é amortização
  balance: number; // Saldo devedor após pagamento
  status: 'pending' | 'paid' | 'late';
  paidAt?: Date;

  // Detalhes extras para visualização
  daysElapsed?: number; // Dias corridos desde o último evento
  balanceBeforePayment?: number; // Saldo + Juros antes do pagamento
  sourcePayment?: any; // Referência ao objeto de pagamento original
}

export interface Loan {
  id: string;
  userId: string;
  name: string; // Ex: "Financiamento Carro", "Empréstimo João"
  type: LoanType;
  principalAmount: number; // Valor original
  interestRate: number; // Taxa de juros (%)
  interestPeriod: InterestPeriod;
  interestType: InterestType;
  startDate: Date;
  numberOfInstallments?: number;

  // Campos calculados/derivados
  totalAmount: number; // Valor total a pagar (inicialmente projetado)
  monthlyPayment?: number; // Valor da parcela (se aplicável)
  installments: LoanInstallment[];
  payments: Payment[]; // Lista de pagamentos realizados

  // Campos de estado atual (calculados em tempo de execução)
  currentBalance?: number;
  totalPaid?: number;

  status: LoanStatus;

  createdAt: Date;
  updatedAt: Date;
  integrate_in_dashboard?: boolean;
}
