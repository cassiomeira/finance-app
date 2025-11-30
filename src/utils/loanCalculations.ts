import { Loan, LoanInstallment, InterestType, InterestPeriod } from '../types/loan';
import { addMonths } from 'date-fns';

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
    while (simulationDate < endDate) {
        // Avançar um dia
        simulationDate = new Date(simulationDate.getTime() + oneDay);

        // Calcular juros do dia sobre o saldo anterior
        const dailyInterest = currentBalance * dailyRate;

        // Adicionar juros ao saldo (Juros Compostos Diários)

        if (currentBalance > 0) {
            currentBalance += dailyInterest;
            totalInterestAccrued += dailyInterest;
        }

        // Verificar se houve pagamento neste dia
        const paymentsToday = sortedPayments.filter(p => {
            const pDate = new Date(p.date);
            pDate.setHours(0, 0, 0, 0);
            return pDate.getTime() === simulationDate.getTime();
        });

        paymentsToday.forEach(payment => {
            currentBalance -= payment.amount;
        });

        if (currentBalance < 0) currentBalance = 0;
    }

    return {
        currentBalance,
        totalInterestAccrued
    };
};
