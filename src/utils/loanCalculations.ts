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

export const calculateDynamicSchedule = (
    loan: Loan,
    payments: { amount: number; date: Date; note?: string }[] = []
): { installments: LoanInstallment[]; currentBalance: number; totalPaid: number } => {
    const { principalAmount, interestRate, interestPeriod, interestType, numberOfInstallments, startDate } = loan;

    // Converter taxa anual para mensal
    let monthlyRate = interestPeriod === 'yearly'
        ? Math.pow(1 + interestRate / 100, 1 / 12) - 1
        : interestRate / 100;

    const installments: LoanInstallment[] = [];
    let currentBalance = principalAmount;
    let totalPaid = 0;

    // Ordenar pagamentos
    const sortedPayments = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Se não tem prazo definido, é apenas juros simples/compostos sobre o saldo
    if (!numberOfInstallments || numberOfInstallments <= 0) {
        // Implementação simplificada para prazo indeterminado (mantém lógica anterior mas processa pagamentos)
        const debt = calculateCurrentDebt(loan, new Date());
        return {
            installments: [],
            currentBalance: debt.currentBalance,
            totalPaid: debt.totalPaid || 0
        };
    }

    // Para prazo determinado (Tabela Price ou Juros Compostos com parcelas fixas iniciais)
    // Recalcular fluxo mês a mês

    // 1. Calcular parcela inicial prevista (PMT)
    let monthlyPayment = 0;
    if (monthlyRate === 0) {
        monthlyPayment = principalAmount / numberOfInstallments;
    } else {
        monthlyPayment = principalAmount * (
            (monthlyRate * Math.pow(1 + monthlyRate, numberOfInstallments)) /
            (Math.pow(1 + monthlyRate, numberOfInstallments) - 1)
        );
    }

    let balance = principalAmount;

    for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDate = addMonths(startDate, i);

        // Juros do período
        const interest = balance * monthlyRate;

        // Valor esperado da parcela (pode mudar se houve amortização extra, mas na Price fixa o PMT tenta se manter, 
        // a menos que recalculemos o PMT a cada mês. Aqui vamos manter o PMT fixo original para referência, 
        // mas o saldo cai mais rápido com pagamentos extras).
        // *Melhoria*: Se o saldo cair muito, a parcela de juros diminui, então a amortização aumenta.

        // Verificar pagamentos feitos neste "mês" (até a data de vencimento desta parcela, que não foram usados antes)
        // Simplificação: Vamos considerar pagamentos "livres". O usuário paga X valor.
        // Esse valor abate juros acumulados e depois principal.

        // Vamos tentar casar pagamentos com parcelas para status visual
        // Mas o cálculo financeiro é sobre o saldo devedor.

        let installmentAmount = monthlyPayment;
        let principalComponent = installmentAmount - interest;

        // Se o saldo for menor que a parcela calculada, ajusta
        if (balance < principalComponent) {
            // Ajuste final
            installmentAmount = balance + interest;
            principalComponent = balance;
        }

        // Verificar se essa parcela foi paga
        // Consideramos "paga" se houver pagamentos suficientes acumulados ou pagamentos específicos perto da data
        // Para simplificar a UX pedida: "Pagar esta parcela".

        // Vamos buscar se existe um pagamento que "cobre" esta parcela ou foi feito explicitamente para ela.
        // Como não temos vínculo ID pagamento -> ID parcela no banco, vamos usar datas e valores aproximados ou
        // simplesmente abater do saldo global e marcar como paga se o saldo remanescente permitir.

        // NOVA ABORDAGEM PEDIDA: "Editar a parcela".
        // Isso sugere que o usuário quer ver o histórico.

        // Vamos cruzar com os pagamentos reais para definir o status e o valor REAL pago.

        // Encontrar pagamentos neste intervalo (entre vencimento anterior e este)
        const prevDueDate = addMonths(startDate, i - 1);
        const paymentsInPeriod = sortedPayments.filter(p =>
            p.date > prevDueDate && p.date <= addMonths(dueDate, 1) // Tolerância de 1 mês ou lógica de "pagamento referente a X"
            // Na verdade, o melhor é: O usuário clica em "Pagar parcela 3". Isso cria um pagamento.
            // Aqui nós apenas lemos. Se houver pagamento, abatemos.
        );

        // Por enquanto, para manter consistência com a "Price", vamos simular a projeção
        // E marcar como paga se o saldo tiver sido abatido.

        // *Refinamento*: O usuário quer "Pagar Parcela".
        // Vamos assumir que se o saldo devedor está diminuindo conforme o esperado, as parcelas estão pagas.

        // Mas para a feature "Pagar Parcela X", o ideal seria ter um vínculo explícito.
        // Sem mudar o banco (tabela loan_installments), vamos inferir:
        // Se existe pagamento registrado próximo ao vencimento ou acumulado.

        // Vamos simplificar: O cálculo dinâmico projeta o futuro com base no saldo ATUAL.
        // O passado é histórico.

        // Se a data da parcela é passado:
        // Verificamos se houve pagamento suficiente.

        // Se a data é futuro:
        // Projetamos com base no saldo atual.

        const isPast = dueDate < new Date();

        // Tentar encontrar um pagamento que corresponda a esta parcela (mesmo valor ou data próxima)
        // Ou simplesmente acumular pagamentos e ir "dando baixa" nas parcelas mais antigas.
        // Estratégia FIFO de pagamentos.

        let status: 'pending' | 'paid' | 'late' = 'pending';
        let paidDate: Date | undefined;
        let paidAmount = 0;

        // Consumir do pool de pagamentos totais
        // (Isso assume que pagamentos quitam parcelas em ordem cronológica)
        const installmentTotalReq = monthlyPayment; // Valor cheio da parcela

        // Total pago acumulado até agora (global)
        // Precisamos saber quanto do totalPaid já foi "usado" para quitar parcelas anteriores.

        // Vamos refazer o loop apenas para "alocar" pagamentos às parcelas.
    }

    // RESTART LOGIC: Alocação de Pagamentos FIFO
    // 1. Temos um pool de pagamentos (sortedPayments).
    // 2. Temos parcelas teóricas (installments).
    // 3. Vamos percorrer as parcelas e "gastar" os pagamentos.

    let remainingPayments = sortedPayments.reduce((sum, p) => sum + p.amount, 0);
    totalPaid = remainingPayments;

    balance = principalAmount; // Reset balance for projection

    const projectedInstallments: LoanInstallment[] = [];

    for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDate = addMonths(startDate, i);
        const interest = balance * monthlyRate;
        let amortization = monthlyPayment - interest;

        // Ajuste se for a última ou saldo pequeno
        if (balance < amortization + 1) { // +1 margem erro
            amortization = balance;
        }

        const installmentValue = interest + amortization;

        let thisInstallmentStatus: 'pending' | 'paid' | 'late' = 'pending';
        let thisInstallmentPaidAt: Date | undefined;

        // Verificar se temos saldo de pagamentos para quitar esta parcela
        if (remainingPayments >= installmentValue - 0.1) { // Tolerância de centavos
            thisInstallmentStatus = 'paid';
            remainingPayments -= installmentValue;
            balance -= amortization; // Abate do principal

            // Tentar achar a data do pagamento que quitou essa parcela (aproximado)
            // Pegamos o último pagamento que contribuiu
            // (Simplificação visual)
            thisInstallmentPaidAt = sortedPayments.find(p => p.date <= dueDate)?.date || dueDate;

        } else if (remainingPayments > 0) {
            // Parcialmente paga (na UI vamos mostrar como pendente mas com valor restante menor? 
            // Ou "Atrasada" se já venceu?)
            // O usuário pediu "Pagar Parcela".
            // Vamos considerar 'pending' mas o saldo devedor vai estar menor.

            // Se pagou parcial, abate do saldo o que deu
            // Mas a parcela continua "em aberto" visualmente ou "parcial"?
            // Vamos manter 'pending' mas o balance real reflete o pagamento.

            // Abater o que sobrou dos pagamentos do principal (após juros)
            const paymentToInterest = Math.min(remainingPayments, interest);
            const paymentToPrincipal = remainingPayments - paymentToInterest;

            balance -= paymentToPrincipal;
            remainingPayments = 0;

            if (dueDate < new Date()) {
                thisInstallmentStatus = 'late';
            }
        } else {
            // Nada pago para esta parcela
            if (dueDate < new Date()) {
                thisInstallmentStatus = 'late';
            }
        }


        // Se já pagamos tudo (balance zerado), as próximas parcelas somem ou ficam zeradas?
        // Se for amortização antecipada, o prazo diminui ou o valor diminui?
        // Na Price, geralmente o prazo diminui se mantiver o valor, ou valor diminui se mantiver prazo.
        // Vamos assumir que mantemos o prazo e recalculamos o valor das próximas (Recálculo Dinâmico pedido).

        if (thisInstallmentStatus === 'pending' || thisInstallmentStatus === 'late') {
            // Recalcular PMT para as parcelas restantes com base no saldo ATUAL
            const remainingMonths = numberOfInstallments - i + 1;
            if (monthlyRate > 0) {
                const newPMT = balance * (
                    (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
                    (Math.pow(1 + monthlyRate, remainingMonths) - 1)
                );
                // Atualiza o valor base para esta e próximas
                monthlyPayment = newPMT;

                // Recalcula componentes desta parcela com novo PMT
                amortization = newPMT - interest;
            } else {
                monthlyPayment = balance / remainingMonths;
                amortization = monthlyPayment;
            }
        }

        // Determinar saldo final desta parcela para exibição e para o próximo loop
        let balanceAfter = balance;

        if (thisInstallmentStatus === 'paid') {
            // Balance já foi decrementado no bloco de pagamento
            balanceAfter = balance;
        } else if (thisInstallmentStatus === 'pending') {
            // Futuro: Simular pagamento (Amortização Padrão)
            // O saldo DEVE cair para o cálculo do juros do próximo mês
            balance -= amortization;
            balanceAfter = balance;
        } else if (thisInstallmentStatus === 'late') {
            // Atrasado: Não pagou. Saldo NÃO diminui.
            // Balance continua cheio.
            balanceAfter = balance;
        }

        // Capture balance for "Current Balance" display (as of today)
        if (dueDate <= new Date()) {
            currentBalance = balanceAfter;
        } else if (i === 1 && dueDate > new Date()) {
            // If the first installment is in the future, current balance is the initial principal (or balance before first inst)
            // But we already initialized currentBalance = principalAmount at the start.
            // However, if we have a down payment or something... 
            // Let's just keep the initialized value if we haven't passed any due date.
        }

        projectedInstallments.push({
            number: i,
            dueDate: dueDate,
            amount: monthlyPayment, // Valor (recalculado ou original)
            interestAmount: interest,
            principalAmount: amortization,
            balance: Math.max(0, balanceAfter), // Saldo pós pagamento desta
            status: thisInstallmentStatus,
            paidAt: thisInstallmentPaidAt
        });
    }

    // If no installments have passed, currentBalance should be principalAmount (which it is initialized to).
    // But wait, we initialized `currentBalance = principalAmount` at line 179.
    // But inside the loop we used `balance` variable. `currentBalance` variable was unused/shadowed?
    // Ah, line 179: `let currentBalance = principalAmount;`
    // Line 210: `let balance = principalAmount;`
    // The loop uses `balance`.
    // The return uses `balance` (line 421: `currentBalance: balance`).
    // So it was returning the final `balance`.

    // We need to return the captured `currentBalance` (which tracks balance at today).
    // But we need to update `currentBalance` inside the loop.

    return {
        installments: projectedInstallments,
        currentBalance: currentBalance, // Return the captured balance as of today
        totalPaid
    };
};
