import { useState, useEffect } from "react";
import { Purchase } from "@/types/purchase";
import { purchasesService } from "@/services/purchasesService";
import { PurchaseItem } from "./PurchaseItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, ShoppingCart, Trash2 } from "lucide-react";
import { BotStatusConfig } from "./BotStatusConfig";

export function PurchasesBoard() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State - EDIT
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Purchase>>({});

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

    // Batch Selection State
    const [selectedPurchases, setSelectedPurchases] = useState<string[]>([]);
    const isSelectionMode = selectedPurchases.length > 0;

    // Batch Modal State
    const [isBatchBuyOpen, setIsBatchBuyOpen] = useState(false);

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

    const handleDelete = async (id: string, batchMode = false) => {
        if (!confirm(batchMode ? "Excluir itens selecionados?" : "Tem certeza que deseja excluir este pedido?")) return;
        try {
            if (batchMode) {
                // Batch Delete
                await Promise.all(selectedPurchases.map(pid => purchasesService.delete(pid)));
                setSelectedPurchases([]);
            } else {
                await purchasesService.delete(id);
            }
            toast.success("Excluído com sucesso");
            loadPurchases();
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const handleToggleSelect = (id: string, selected: boolean) => {
        if (selected) {
            setSelectedPurchases([...selectedPurchases, id]);
        } else {
            setSelectedPurchases(selectedPurchases.filter(pid => pid !== id));
        }
    };

    const handleBatchBuy = async () => {
        if (!amount) return;
        setIsSaving(true);
        try {
            const batchId = crypto.randomUUID();
            let receiptUrl = "";
            if (file) {
                receiptUrl = await purchasesService.uploadReceipt(file);
            }

            // Update all selected purchases
            await Promise.all(selectedPurchases.map(id => {
                // Find original to keep some data if needed, or just update common fields
                const original = purchases.find(p => p.id === id);
                if (!original) return Promise.resolve();

                return purchasesService.update(id, {
                    status: 'waiting',
                    item: original.item, // Keep original item name
                    client: editedClient || original.client || 'Geral', // Override client if edited, else keep
                    supplier: editedSupplier, // Common supplier
                    amount: parseFloat(amount) / selectedPurchases.length, // Split amount? Or is amount PER item? 
                    // Let's assume User enters TOTAL amount for the batch, so we split it?
                    // OR User enters individual amount?
                    // Usually batch receipt = Total Amount. Only Way to track is split.
                    // But quantity might vary.
                    // SIMPLE APPROACH: Split Total Amount equally for accounting.
                    purchase_date: buyDate,
                    batch_id: batchId,
                    receipt_url: receiptUrl,
                    installments: parseInt(installments) || 1
                });
            }));

            toast.success("Compra em Lote Registrada!");
            setIsBatchBuyOpen(false);
            setSelectedPurchases([]);
            setFile(null);
            loadPurchases();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar lote");
        } finally {
            setIsSaving(false);
        }
    };

    const handleResendNotification = async (id: string) => {
        const toastId = toast.loading("Solicitando reenvio... 📨");
        try {
            await purchasesService.update(id, {
                // @ts-ignore - Field might not be in type yet
                last_notification_request: new Date().toISOString()
            });
            toast.success("Solicitação enviada! O bot deve notificar em instantes.", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Erro ao solicitar reenvio", { id: toastId });
        }

    };

    const handleEdit = (purchase: Purchase) => {
        setEditingId(purchase.id);
        setEditForm({ ...purchase });
        setIsEditOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        setIsSaving(true);
        try {
            await purchasesService.update(editingId, editForm);
            toast.success("Pedido atualizado!");
            setIsEditOpen(false);
            loadPurchases();
        } catch (error) {
            toast.error("Erro ao atualizar");
        } finally {
            setIsSaving(false);
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

            // Determine API URL based on environment
            // If VITE_API_URL is set (e.g. via .env), use it.
            // Otherwise, if running locally, try localhost.
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';

            console.log("Using API URL:", apiUrl);

            const response = await fetch(`${apiUrl}/api/analyze`, {
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

    // Drag & Drop State
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = "move";
        // Ghost image transparency hack if needed, but default is usually fine
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, targetClient: string) => {
        e.preventDefault();
        if (!draggedItemId) return;

        const purchase = purchases.find(p => p.id === draggedItemId);
        if (purchase && (purchase.client || 'Geral') !== targetClient) {

            // Optimistic UI Update (optional, but let's just reload for safety first)
            const toastId = toast.loading(`Movendo para ${targetClient}...`);

            try {
                await purchasesService.update(purchase.id, { client: targetClient });
                toast.success("Movido!", { id: toastId });
                loadPurchases(); // Refresh
            } catch (error) {
                toast.error("Erro ao mover", { id: toastId });
            }
        }
        setDraggedItemId(null);
    };

    // Grouping Logic: Get unique clients
    const clients = Array.from(new Set(purchases.map(p => p.client || 'Geral'))).sort();

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between px-4 pt-2">
                <h2 className="text-lg font-bold">Gestão de Compras</h2>
                <BotStatusConfig />
            </div>
            <div className="flex flex-col gap-8 px-4 pb-20">
                {clients.map(client => {
                    const clientPurchases = purchases.filter(p => (p.client || 'Geral') === client);
                    return (
                        <div
                            key={client}
                            className="w-full transition-colors rounded-xl p-4 border border-transparent hover:border-dashed hover:border-primary/20 hover:bg-secondary/10"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, client)}
                        >
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 pointer-events-none">
                                <span className="p-2 bg-secondary rounded-lg">{client}</span>
                                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{clientPurchases.length}</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {clientPurchases.map(p => (
                                    <div
                                        key={p.id}
                                        draggable={!isSelectionMode} // Disable drag when selecting
                                        onDragStart={(e) => handleDragStart(e, p.id)}
                                        className="cursor-move active:cursor-grabbing hover:scale-[1.02] transition-transform"
                                        onClick={() => {
                                            if (!isSelectionMode) handleEdit(p);
                                        }}
                                    >
                                        <PurchaseItem
                                            purchase={p}
                                            onRegisterBuy={handleRegisterBuy}
                                            onConfirmReceive={handleOpenReceive}
                                            onDelete={handleDelete}
                                            onResendNotification={handleResendNotification}
                                            isSelected={selectedPurchases.includes(p.id)}
                                            onToggleSelect={handleToggleSelect}
                                            selectionMode={isSelectionMode}
                                        // Pass no-op specific click handler if handled by parent, or modify PurchaseItem to accept onEdit
                                        // Actually, clicking the card body opens edit. specific buttons stop propagation.
                                        />
                                    </div>
                                ))}
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

            {/* Batch Action Toolbar */}
            {isSelectionMode && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
                    <span className="font-bold text-sm text-gray-700">{selectedPurchases.length} selecionado(s)</span>
                    <div className="h-6 w-px bg-gray-300" />
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={() => {
                            setEditedClient("Múltiplos Clientes");
                            setAmount("");
                            setInstallments("1");
                            setBuyDate(new Date().toISOString().split('T')[0]);
                            setIsBatchBuyOpen(true);
                        }}
                    >
                        <ShoppingCart className="mr-2 h-4 w-4" /> Comprar em Lote
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete("", true)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPurchases([])}
                    >
                        Cancelar
                    </Button>
                </div>
            )}

            {/* Modal BATCH Buy */}
            <Dialog open={isBatchBuyOpen} onOpenChange={(open) => !open && setIsBatchBuyOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Compra em Lote ({selectedPurchases.length} itens)</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="bg-orange-50 p-3 rounded text-sm text-orange-800 border border-orange-200">
                            📦 Você está comprando <b>{selectedPurchases.length} itens</b> de uma vez.
                            O valor total será dividido igualmente para fins de relatório.
                        </div>

                        {/* File + Magic */}
                        <div className="flex flex-col gap-2">
                            <Label>Comprovante Único (Obrigatório)</Label>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Empresa / Comprador</Label>
                                <Input
                                    value={editedClient}
                                    onChange={e => setEditedClient(e.target.value)}
                                    placeholder="Ex: SPN Telecom"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fornecedor (Vendedor)</Label>
                                <Input
                                    value={editedSupplier}
                                    onChange={e => setEditedSupplier(e.target.value)}
                                    placeholder="Ex: Mercado Livre"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor TOTAL da Nota (R$)</Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Frete Total (R$)</Label>
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
                                <Input
                                    type="number"
                                    value={installments}
                                    onChange={e => setInstallments(e.target.value)}
                                    min="1"
                                />
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
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBatchBuyOpen(false)}>Cancelar</Button>
                        <Button onClick={handleBatchBuy} disabled={isSaving || !amount}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Lote
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal EDIT (General) */}
            <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Pedido</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Item / Descrição</Label>
                            <Input
                                value={editForm.item || ''}
                                onChange={e => setEditForm({ ...editForm, item: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <Input
                                    type="number"
                                    value={editForm.quantity || ''}
                                    onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={editForm.status || 'pending'}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                >
                                    <option value="pending">A Comprar (Pendente)</option>
                                    <option value="waiting">A Chegar (Comprado)</option>
                                    <option value="completed">Concluído (Entregue)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <Input
                                    value={editForm.client || ''}
                                    onChange={e => setEditForm({ ...editForm, client: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fornecedor</Label>
                                <Input
                                    value={editForm.supplier || ''}
                                    onChange={e => setEditForm({ ...editForm, supplier: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Observação</Label>
                            <Textarea
                                value={editForm.observation || ''}
                                onChange={e => setEditForm({ ...editForm, observation: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
