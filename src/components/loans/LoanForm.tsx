import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { calculateLoan } from '@/utils/loanCalculations';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    type: z.enum(['borrowed', 'lent'] as const),
    principalAmount: z.coerce.number().min(1, 'Valor deve ser maior que 0'),
    interestRate: z.coerce.number().min(0, 'Taxa deve ser maior ou igual a 0'),
    interestPeriod: z.enum(['monthly', 'yearly'] as const),
    interestType: z.enum(['compound', 'fixed_installment'] as const),
    numberOfInstallments: z.coerce.number().optional(),
    startDate: z.date(),
    isIndefinite: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface LoanFormProps {
    onSubmit: (data: FormValues) => void;
    isLoading?: boolean;
}

export function LoanForm({ onSubmit, isLoading }: LoanFormProps) {
    const [preview, setPreview] = useState<{
        totalAmount: number;
        monthlyPayment: number;
    } | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            type: 'borrowed',
            principalAmount: 0,
            interestRate: 0,
            interestPeriod: 'monthly',
            interestType: 'fixed_installment',
            numberOfInstallments: 12,
            startDate: new Date(),
            isIndefinite: false,
        },
    });

    const values = form.watch();
    const isIndefinite = values.isIndefinite;

    useEffect(() => {
        if (
            values.principalAmount > 0 &&
            (isIndefinite || (values.numberOfInstallments && values.numberOfInstallments > 0))
        ) {
            const result = calculateLoan(
                values.principalAmount,
                values.interestRate,
                values.interestPeriod,
                values.interestType,
                isIndefinite ? undefined : values.numberOfInstallments,
                values.startDate
            );
            setPreview({
                totalAmount: result.totalAmount,
                monthlyPayment: result.monthlyPayment,
            });
        } else {
            setPreview(null);
        }
    }, [
        values.principalAmount,
        values.interestRate,
        values.interestPeriod,
        values.interestType,
        values.numberOfInstallments,
        values.startDate,
        isIndefinite,
    ]);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Empréstimo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Financiamento Carro" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="borrowed">Peguei Emprestado</SelectItem>
                                            <SelectItem value="lent">Emprestei</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="principalAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor (R$)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="interestRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Taxa de Juros (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="interestPeriod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Período da Taxa</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="monthly">Mensal</SelectItem>
                                            <SelectItem value="yearly">Anual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="interestType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Modalidade</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="fixed_installment">
                                                Parcelas Fixas (Price)
                                            </SelectItem>
                                            <SelectItem value="compound">Juros Compostos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormField
                                control={form.control}
                                name="isIndefinite"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Prazo Indeterminado</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {!isIndefinite && (
                                <FormField
                                    control={form.control}
                                    name="numberOfInstallments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nº de Parcelas</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data de Início</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: ptBR })
                                                ) : (
                                                    <span>Escolha uma data</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Salvando..." : "Criar Empréstimo"}
                    </Button>
                </form>
            </Form>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Simulação
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {preview ? (
                            <>
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                    <span className="text-sm font-medium">
                                        {isIndefinite ? 'Juros Mensais (Estimado)' : 'Valor da Parcela'}
                                    </span>
                                    <span className="text-lg font-bold text-primary">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(preview.monthlyPayment)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                    <span className="text-sm font-medium">Total a Pagar</span>
                                    <span className="text-lg font-bold">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(preview.totalAmount)}
                                    </span>
                                </div>
                                {!isIndefinite && (
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <span className="text-sm font-medium">Total de Juros</span>
                                        <span className="text-lg font-bold text-destructive">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(preview.totalAmount - values.principalAmount)}
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                Preencha os valores para ver a simulação
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
