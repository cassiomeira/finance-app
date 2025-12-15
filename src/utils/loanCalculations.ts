import { LoanInstallment, InterestType, InterestPeriod, Loan } from '../types/loan';
import { addMonths, differenceInDays } from 'date-fns';

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

    // Calcular dias decorridos e saldo parcial para simulação pura
    // Importante: No caso de simulação inicial, assumimos datas perfeitas
    let previousDate = startDate;
    let runningBalance = principal;

    for (let i = 0; i < installments.length; i++) {
        const inst = installments[i];

        // Recalcular com detalhes extras
        // Dias
        const days = differenceInDays(inst.dueDate, previousDate);

        // Juros Pro-Rata (apenas informativo na simulação Price, pois Price usa mensal cheio)
        // Mas para consistência visual:
        let interestProRata = 0;
        if (days > 0 && monthlyRate > 0) {
            const dailyRate = Math.pow(1 + monthlyRate, 1 / 30) - 1;
            interestProRata = runningBalance * (Math.pow(1 + dailyRate, days) - 1);
        }

        inst.daysElapsed = days;
        inst.balanceBeforePayment = runningBalance + interestProRata;

        runningBalance = inst.balance; // Price já definiu o saldo final
        previousDate = inst.dueDate;
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

    let balance = Number(loan.principalAmount);
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
        const interest = Number(currentBalance) * (Math.pow(1 + dailyRate, days) - 1);
        return interest;
    };

    // Processar pagamentos
    for (const payment of sortedPayments) {
        if (payment.date > currentDate) break; // Pagamentos futuros não contam ainda

        // Skip payments with any note - only null/undefined notes are realized payments
        if (payment.note) continue;

        // Adicionar juros do período anterior até este pagamento
        const interest = addInterest(lastDate, payment.date, balance);
        balance += interest;
        accumulatedInterest += interest;

        // Abater pagamento
        balance -= Number(payment.amount);
        totalPaid += Number(payment.amount);

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

export const calculateDynamicSchedule = (
    loan: Loan,
    payments: { amount: number; date: Date; note?: string }[] = []
): { installments: LoanInstallment[]; currentBalance: number; totalPaid: number; monthlyPayment: number } => {
    const { principalAmount, interestRate, interestPeriod, numberOfInstallments, startDate } = loan;

    // Converter taxa anual p/ mensal
    let monthlyRate = interestPeriod === 'yearly'
        ? Math.pow(1 + interestRate / 100, 1 / 12) - 1
        : interestRate / 100;

    // Se não tem prazo definido, fluxo simplificado (mantém original)
    if (!numberOfInstallments || numberOfInstallments <= 0) {
        const debt = calculateCurrentDebt(loan, new Date());
        return {
            installments: [],
            currentBalance: debt.currentBalance,
            totalPaid: debt.totalPaid || 0,
            monthlyPayment: 0
        };
    }

    // Calcula PMT (Valor da Parcela Tabela Price) para referência visual e default
    let scheduledPMT = 0;
    if (monthlyRate === 0) {
        scheduledPMT = Number(principalAmount) / numberOfInstallments;
    } else {
        scheduledPMT = Number(principalAmount) * (
            (monthlyRate * Math.pow(1 + monthlyRate, numberOfInstallments)) /
            (Math.pow(1 + monthlyRate, numberOfInstallments) - 1)
        );
    }

    const installments: LoanInstallment[] = [];
    let currentBalance = Number(principalAmount);
    let totalPaid = 0;
    let balanceAfterLastPaid = Number(principalAmount); // Track balance after last PAID installment

    // Assegura data válida
    let validStartDate = new Date(startDate);
    if (isNaN(validStartDate.getTime())) validStartDate = new Date();

    // Separar pagamentos vinculados (tagged) dos soltos (untagged)
    const taggedPayments = new Map<number, any>();
    const untaggedPayments: any[] = [];

    // Pre-process payments
    [...payments]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(p => {
            // Cast to access optional installmentNumber if not in strict type
            const pAny = p as any;
            if (pAny.installmentNumber !== undefined && pAny.installmentNumber !== null) {
                taggedPayments.set(Number(pAny.installmentNumber), p);
            } else {
                untaggedPayments.push(p);
            }
        });

    let previousDate = validStartDate;

    for (let i = 1; i <= numberOfInstallments; i++) {
        // Data de vencimento TEÓRICA desta parcela
        const dueDate = addMonths(validStartDate, i);

        let paymentAmount = 0;
        let effectiveDate = dueDate; // Data considerada para cálculo de juros (pagamento real ou vencimento)
        let status: 'pending' | 'paid' | 'late' = 'pending';
        let paidAt: Date | undefined = undefined;

        // Consumir o próximo pagamento disponível
        let usedPayment = undefined;

        // 1. Prioridade Absoluta: Pagamento "Taggeado" para esta parcela
        if (taggedPayments.has(i)) {
            usedPayment = taggedPayments.get(i);
        }
        // 2. Fallback: Fila de pagamentos sem tag (legado/genérico)
        else if (untaggedPayments.length > 0) {
            usedPayment = untaggedPayments[0];
            untaggedPayments.shift();
        }

        if (usedPayment) {
            const nextPayment = usedPayment;

            // If note exists (any note), it's pending/scheduled. Only null/undefined = paid.
            const isPending = !!nextPayment.note;

            // Aceita o pagamento ou override
            paymentAmount = Number(nextPayment.amount);
            effectiveDate = new Date(nextPayment.date);

            if (isPending) {
                status = 'pending';
                paidAt = undefined;
            } else {
                status = 'paid';
                paidAt = effectiveDate;
                totalPaid += paymentAmount;
            }
        } else {
            // Nenhum pagamento disponível para esta parcela
            if (dueDate < new Date()) {
                status = 'late';
            }
        }

        // --- CÁLCULO FINANCEIRO ---

        // 1. Dias Decorridos (Real: data efetiva - data anterior)
        const daysElapsed = differenceInDays(effectiveDate, previousDate);

        // 2. Juros Pro-Rata (baseado no saldo atual)
        let interest = 0;
        if (Number(monthlyRate) > 0) {
            // Garante que daysElapsed é number. differenceInDays retorna number, mas protegemos.
            const days = isNaN(daysElapsed) ? 30 : daysElapsed;

            if (days > 0) {
                const dailyRate = Math.pow(1 + monthlyRate, 1 / 30) - 1;
                interest = Number(currentBalance) * (Math.pow(1 + dailyRate, days) - 1);
            }
        }

        const balanceBeforePayment = Number(currentBalance) + Number(interest);

        // 3. Amortização
        let principalAmortization = 0;

        if (status === 'paid') {
            // Se pagou, deduz juros do valor pago. O resto abate principal.
            principalAmortization = paymentAmount - interest;
        } else if (usedPayment) {
            // Pagamento costumizado existe mas ainda pendente - usa o valor do usuário
            principalAmortization = paymentAmount - interest;
        } else {
            // Nenhum pagamento customizado - usa o planejado (scheduledPMT).
            paymentAmount = scheduledPMT;
            principalAmortization = scheduledPMT - interest;
        }

        let balanceAfter = Number(currentBalance) - principalAmortization;

        // Ajuste fino pra zerar
        let finalBalance = balanceAfter;
        if (i === numberOfInstallments && Math.abs(finalBalance) < 10) {
            finalBalance = 0; // Tolerância maior no final
        }

        installments.push({
            number: i,
            dueDate: effectiveDate, // Mostra data efetiva (paga/agendada) ou vencimento original? O usuário quer override.
            amount: paymentAmount, // Valor pago (ou agendado)
            interestAmount: interest,
            principalAmount: principalAmortization,
            balance: Math.max(0, finalBalance),
            status: status,
            paidAt: paidAt,
            daysElapsed: daysElapsed,
            balanceBeforePayment: balanceBeforePayment,
            sourcePayment: usedPayment
        });

        currentBalance = finalBalance;
        previousDate = effectiveDate;

        // Track balance after last paid installment
        if (status === 'paid') {
            balanceAfterLastPaid = finalBalance;
        }
    }

    return {
        installments,
        currentBalance: Math.max(0, balanceAfterLastPaid), // Balance after last PAID installment
        totalPaid,
        monthlyPayment: scheduledPMT
    };
};

export const calculateCustomSchedule = (
    principal: number,
    rate: number,
    startDate: Date,
    months: number,
    type: InterestType = 'fixed_installment',
    period: InterestPeriod = 'monthly',
    overrides: Record<number, { amount?: number, date?: Date }> = {}
): LoanInstallment[] => {
    // Converter taxa anual p/ mensal se necessario
    const monthlyRate = period === 'yearly'
        ? Math.pow(1 + rate / 100, 1 / 12) - 1
        : rate / 100;

    let currentBalance = Number(principal);
    const installments: LoanInstallment[] = [];
    let previousDate = startDate;

    let defaultPaymentAmount = 0;

    // Calculate default payment based on type (same logic as calculateLoan)
    if (type === 'compound') {
        const finalAmount = principal * Math.pow(1 + monthlyRate, months);
        defaultPaymentAmount = finalAmount / months;
    } else {
        // Fixed Installment (Price)
        if (monthlyRate === 0) {
            defaultPaymentAmount = principal / months;
        } else {
            defaultPaymentAmount = principal * (
                (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                (Math.pow(1 + monthlyRate, months) - 1)
            );
        }
    }

    for (let i = 1; i <= months; i++) {
        const override = overrides[i];

        let dueDate = addMonths(startDate, i);
        if (override?.date) {
            dueDate = override.date;
        }

        const daysElapsed = differenceInDays(dueDate, previousDate);

        let interest = 0;
        if (daysElapsed > 0 && monthlyRate > 0) {
            const dailyRate = Math.pow(1 + monthlyRate, 1 / 30) - 1;
            interest = Number(currentBalance) * (Math.pow(1 + dailyRate, daysElapsed) - 1);
        }

        const balanceBeforePayment = Number(currentBalance) + Number(interest);

        let paymentAmount = 0;

        if (override?.amount !== undefined) {
            paymentAmount = Number(override.amount);
        } else {
            paymentAmount = defaultPaymentAmount;
        }

        let principalAmortization = 0;

        // Logic depends on type? 
        // For PRICE (fixed_installment), Amortization = Pmt - Interest
        // For COMPOUND, logic in calculateLoan was:
        // interestAmount: (totalAmount - principal) / months, 
        // principalAmount: principal / months
        // But here we are doing a dynamic simulation day-by-day.
        // If we want consistency with the "Default" compound calculation which effectively ignores the daily balance for interest calculation (it pre-calculates total),
        // we might have a drift if we use dynamic daily interest.
        // However, dynamic is more "real".
        // Let's stick to standard financial logic: Amortization = Payment - Interest.

        principalAmortization = paymentAmount - interest;

        // Prevent overpaying principal
        if (Number(currentBalance) - principalAmortization < 0) {
            // Adjust to pay off exactly
            principalAmortization = Number(currentBalance);
            if (override?.amount === undefined) {
                // If not overridden, adjust payment too
                paymentAmount = principalAmortization + interest;
            }
            // If overridden, we keep paymentAmount and amortization is capped? 
            // Or we let amortization be what it is (maybe negative meaning overpayment?)
            // Let's cap amortization at currentBalance.
        }

        let finalBal = currentBalance - principalAmortization;
        if (finalBal < 0.01) finalBal = 0;

        installments.push({
            number: i,
            dueDate,
            amount: paymentAmount,
            interestAmount: interest,
            principalAmount: principalAmortization,
            balance: finalBal,
            status: 'pending',
            daysElapsed,
            balanceBeforePayment
        });

        currentBalance = finalBal;
        previousDate = dueDate;
    }

    return installments;
};
