import { LoanInstallment, InterestType, InterestPeriod, Loan } from '../types/loan';
import { addMonths, differenceInDays, differenceInMonths } from 'date-fns';

export const calculateLoan = (
    principal: number,
    rate: number,
    period: InterestPeriod,
    type: InterestType,
    months: number | undefined,
    startDate: Date
): { totalAmount: number; monthlyPayment: number; installments: LoanInstallment[] } => {

    // Converter taxa anual para mensal se necessário
    let monthlyRate = period === 'yearly'
        ? Math.pow(1 + rate / 100, 1 / 12) - 1
        : rate / 100;

    // Se não houver prazo definido (months undefined ou 0), retornamos projeção básica
    if (!months || months <= 0) {
        // Para prazo indeterminado, o "total" inicial é o principal
        // A "parcela" pode ser considerada apenas os juros do primeiro mês para referência
        const firstMonthInterest = principal * monthlyRate;

        return {
            totalAmount: principal,
            monthlyPayment: firstMonthInterest, // Sugestão de pagamento mínimo (juros)
            installments: []
        };
    }

    const installments: LoanInstallment[] = [];
    let totalAmount = 0;
    let monthlyPayment = 0;

    if (type === 'fixed_installment') {
        // Tabela Price (Financiamento de Veículos, etc)
        // PMT = P * [i(1+i)^n] / [(1+i)^n - 1]

        if (monthlyRate === 0) {
            monthlyPayment = principal / months;
        } else {
            monthlyPayment = principal * (
                (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                (Math.pow(1 + monthlyRate, months) - 1)
            );
        }

        let currentBalance = principal;
        totalAmount = monthlyPayment * months;

        for (let i = 1; i <= months; i++) {
            const interest = currentBalance * monthlyRate;
            const amortization = monthlyPayment - interest;
            currentBalance -= amortization;

            // Ajuste final para zerar saldo devido a arredondamentos
            if (i === months && Math.abs(currentBalance) < 1) {
                currentBalance = 0;
            }

            installments.push({
                number: i,
                dueDate: addMonths(startDate, i),
                amount: monthlyPayment,
                interestAmount: interest,
                principalAmount: amortization,
                balance: Math.max(0, currentBalance),
                status: 'pending'
            });
        }

    } else if (type === 'compound') {
        // Juros Compostos
        const finalAmount = principal * Math.pow(1 + monthlyRate, months);
        totalAmount = finalAmount;
        monthlyPayment = finalAmount / months;

        for (let i = 1; i <= months; i++) {
            installments.push({
                number: i,
                dueDate: addMonths(startDate, i),
                amount: monthlyPayment,
                interestAmount: (totalAmount - principal) / months,
                principalAmount: principal / months,
                balance: totalAmount - (monthlyPayment * i),
                status: 'pending'
            });
        }
    }

    return {
        totalAmount,
        monthlyPayment,
        installments
    };
};

export const calculateCurrentDebt = (loan: Loan, currentDate: Date = new Date()) => {
    // Converter taxa anual para mensal se necessário
    let monthlyRate = loan.interestPeriod === 'yearly'
        ? Math.pow(1 + loan.interestRate / 100, 1 / 12) - 1
        : loan.interestRate / 100;

    // Calcular juros diários compostos desde o início até hoje
    // Fórmula: M = P * (1 + i)^n
    // Onde n é o número de meses (ou fração de meses)

    // Abordagem simplificada: Calcular saldo dia a dia considerando pagamentos
    // Isso é mais preciso para amortizações irregulares

    let balance = loan.principalAmount;
    let lastDate = new Date(loan.startDate);

    // Validar data
    if (isNaN(lastDate.getTime())) {
        lastDate = new Date();
    }

    // Ordenar pagamentos por data
    const sortedPayments = [...(loan.payments || [])].sort((a, b) => a.date.getTime() - b.date.getTime());

    let totalPaid = 0;
    let accumulatedInterest = 0;

    // Função auxiliar para adicionar juros entre duas datas
    const addInterest = (from: Date, to: Date, currentBalance: number) => {
        if (currentBalance <= 0) return 0;
        const days = differenceInDays(to, from);
        if (days <= 0) return 0;

        // Taxa diária equivalente
        const dailyRate = Math.pow(1 + monthlyRate, 1 / 30) - 1;
        const interest = currentBalance * (Math.pow(1 + dailyRate, days) - 1);
        return interest;
    };

    // Processar pagamentos
    for (const payment of sortedPayments) {
        if (payment.date > currentDate) break; // Pagamentos futuros não contam ainda

        // Adicionar juros do período anterior até este pagamento
        const interest = addInterest(lastDate, payment.date, balance);
        balance += interest;
        accumulatedInterest += interest;

        // Abater pagamento
        balance -= payment.amount;
        totalPaid += payment.amount;

        lastDate = payment.date;
    }

    // Adicionar juros do último pagamento até hoje
    if (currentDate > lastDate) {
        const interest = addInterest(lastDate, currentDate, balance);
        balance += interest;
        accumulatedInterest += interest;
    }

    return {
        currentBalance: Math.max(0, balance),
        totalPaid,
        accumulatedInterest
    };
};
