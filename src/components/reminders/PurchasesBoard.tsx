import { useState, useEffect } from "react";
import { Purchase } from "@/types/purchase";
import { purchasesService } from "@/services/purchasesService";
import { PurchaseItem } from "./PurchaseItem";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

export function PurchasesBoard() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State - BUY
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [amount, setAmount] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [installments, setInstallments] = useState("1");
    const [buyDate, setBuyDate] = useState("");
    const [freight, setFreight] = useState("");
    const [editedItem, setEditedItem] = useState("");
    const [editedClient, setEditedClient] = useState("");
    const [editedSupplier, setEditedSupplier] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // Modal State - RECEIVE
    const [receivingPurchase, setReceivingPurchase] = useState<Purchase | null>(null);
    const [receivedQty, setReceivedQty] = useState("");
    const [observation, setObservation] = useState("");

    const [isSaving, setIsSaving] = useState(false);

    const loadPurchases = async () => {
        setLoading(true);
        try {
            const data = await purchasesService.getAll();
            setPurchases(data);
        } catch (error) {
            toast.error("Erro ao carregar compras");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPurchases();
    }, []);

    const handleRegisterBuy = (purchase: Purchase) => {
        setSelectedPurchase(purchase);
        setAmount("");
        setQuantity(purchase.quantity?.toString() || "1");
        setInstallments("1");
        setBuyDate(new Date().toISOString().split('T')[0]);
        setFreight("");
        setEditedItem(purchase.item);
        setEditedClient(purchase.client || 'Geral');
        setEditedSupplier(purchase.supplier || ""); // Reset supplier
        setFile(null);
    };

    const handleOpenReceive = (purchase: Purchase) => {
        setReceivingPurchase(purchase);
        setReceivedQty(purchase.quantity?.toString() || "1");
        setObservation("");
    }

    const handleConfirmReceive = async () => {
        if (!receivingPurchase) return;
        setIsSaving(true);
        try {
            await purchasesService.update(receivingPurchase.id, {
                status: 'completed',
                received_quantity: parseInt(receivedQty),
                observation: observation
            });
            toast.success("Entrega confirmada!");
            loadPurchases();
            setReceivingPurchase(null);
        } catch (error) {
            toast.error("Erro ao atualizar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este pedido?")) return;
        try {
            await purchasesService.delete(id);
            toast.success("Pedido excluído");
            loadPurchases();
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const handleSaveBuy = async () => {
        if (!selectedPurchase || !amount) return;
        setIsSaving(true);
        try {
            let receiptUrl = "";
            if (file) {
                receiptUrl = await purchasesService.uploadReceipt(file);
            }

            await purchasesService.update(selectedPurchase.id, {
                status: 'waiting',
                item: editedItem,
                client: editedClient,
                supplier: editedSupplier,
                amount: parseFloat(amount),
                quantity: parseInt(quantity),
                installments: parseInt(installments) || 1,
                purchase_date: buyDate,
                freight: parseFloat(freight) || 0,
                receipt_url: receiptUrl
            });

            toast.success("Compra registrada!");
            setSelectedPurchase(null);
            loadPurchases();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar compra");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMagicRead = async () => {
        if (!file) return toast.error("Selecione um arquivo primeiro!");

        const toastId = toast.loading("Lendo comprovante com IA... 🔮");

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Change invalid port if necessary. Using 3005 as configured in bot.
            const response = await fetch('http://localhost:3005/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Falha na leitura");

            const data = await response.json();
            console.log("Magic Data:", data);

            if (data.amount) setAmount(data.amount.toString());
            if (data.installments) setInstallments(data.installments.toString());
            if (data.date) setBuyDate(data.date);
            if (data.quantity) setQuantity(data.quantity.toString());
            if (data.item) setEditedItem(data.item);
            if (data.supplier) setEditedSupplier(data.supplier); // Map AI Supplier to Supplier Field
            // Keep Client as is (user must select purchasing company) or maybe default to 'Masternet' if empty?
            // For now, let's leave Client alone (it defaults to 'Geral' or current value).
            if (data.freight) setFreight(data.freight.toString());

            toast.success("Dados preenchidos! ✨", { id: toastId });

        } catch (error) {
            console.error(error);
            toast.error("Não consegui ler o arquivo. Tente manual.", { id: toastId });
        }
    };

    // Grouping Logic: Get unique clients
    const clients = Array.from(new Set(purchases.map(p => p.client || 'Geral'))).sort();

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col gap-4">
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="flex w-max space-x-4 p-4">
                    {clients.map(client => {
                        const clientPurchases = purchases.filter(p => (p.client || 'Geral') === client);
                        return (
                            <div key={client} className="w-[300px] shrink-0 bg-secondary/30 rounded-lg p-3">
                                <h3 className="font-bold mb-3 flex items-center justify-between">
                                    {client}
                                    <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{clientPurchases.length}</span>
                                </h3>
                                <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
                                    {clientPurchases.map(p => (
                                        <PurchaseItem
                                            key={p.id}
                                            purchase={p}
                                            onRegisterBuy={handleRegisterBuy}
                                            onConfirmReceive={handleOpenReceive}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                    {clientPurchases.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nada aqui</p>}
                                </div>
                            </div>
                        )
                    })}
                    {clients.length === 0 && (
                        <div className="w-full flex flex-col items-center justify-center p-12 text-muted-foreground opacity-50">
                            <p>Nenhuma solicitação de compra.</p>
                            <p className="text-xs">Peça pelo WhatsApp: "Comprar X para Cliente Y"</p>
                        </div>
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Modal Register Buy */}
            <Dialog open={!!selectedPurchase} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Compra: {selectedPurchase?.item}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* File + Magic */}
                        <div className="flex flex-col gap-2">
                            <Label>Comprovante & Leitura IA</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="file"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    accept="image/*,application/pdf"
                                    className="flex-1"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="shrink-0 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                    title="Leitura Mágica (IA)"
                                    onClick={handleMagicRead}
                                    type="button"
                                >
                                    ✨
                                </Button>
                            </div>
                        </div>



                        {/* Item & Client */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Item / Produto</Label>
                                <Input
                                    value={editedItem}
                                    onChange={e => setEditedItem(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Empresa / Comprador</Label>
                                <Input
                                    value={editedClient}
                                    onChange={e => setEditedClient(e.target.value)}
                                    placeholder="Ex: Masternet, Suprinet"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fornecedor (Vendedor)</Label>
                                <Input
                                    value={editedSupplier}
                                    onChange={e => setEditedSupplier(e.target.value)}
                                    placeholder="Ex: Mercado Livre, Kabum"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor Total (R$)</Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Frete (R$) <span className="text-[10px] text-muted-foreground">(Opcional)</span></Label>
                                <Input
                                    type="number"
                                    value={freight}
                                    onChange={e => setFreight(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Parcelas</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={installments}
                                        onChange={e => setInstallments(e.target.value)}
                                        min="1"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        x R$ {amount && installments ? (parseFloat(amount) / parseInt(installments)).toFixed(2) : '0.00'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Data da Compra</Label>
                                <Input
                                    type="date"
                                    value={buyDate}
                                    onChange={e => setBuyDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantidade do Item</Label>
                            <Input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                        </div>

                    </div >

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedPurchase(null)}>Cancelar</Button>
                        <Button onClick={handleSaveBuy} disabled={isSaving || !amount}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Compra
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >

            {/* Modal Confirm Receive */}
            {/* Modal Confirm Receive */}
            <Dialog open={!!receivingPurchase} onOpenChange={(open) => !open && setReceivingPurchase(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Recebimento</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Qtd. Recebida</Label>
                            <div className="col-span-3">
                                <Input
                                    type="number"
                                    value={receivedQty}
                                    onChange={e => setReceivedQty(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Solicitado: {receivingPurchase?.quantity || '?'} | Faltam: {receivingPurchase?.quantity ? Math.max(0, receivingPurchase.quantity - parseInt(receivedQty || '0')) : 0}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Observações</Label>
                            <Textarea
                                value={observation}
                                onChange={e => setObservation(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: Veio incompleto, caixa amassada..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReceivingPurchase(null)}>Cancelar</Button>
                        <Button onClick={handleConfirmReceive} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Entrega
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

        </div >
    );
}
