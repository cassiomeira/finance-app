import { Purchase } from "@/types/purchase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ShoppingCart, Clock, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface PurchaseItemProps {
    purchase: Purchase;
    onRegisterBuy: (purchase: Purchase) => void;
    onConfirmReceive: (purchase: Purchase) => void;
    onDelete: (id: string) => void;
    onResendNotification: (id: string) => void;

    // Batch Selection Props
    isSelected?: boolean;
    onToggleSelect?: (id: string, selected: boolean) => void;
    selectionMode?: boolean;
}

export function PurchaseItem({
    purchase,
    onRegisterBuy,
    onConfirmReceive,
    onDelete,
    onResendNotification,
    isSelected = false,
    onToggleSelect,
    selectionMode = false
}: PurchaseItemProps) {
    const isPending = purchase.status === 'pending';
    const isWaiting = purchase.status === 'waiting';
    const isCompleted = purchase.status === 'completed';

    return (
        <Card className={`group p-3 mb-2 flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-md border-l-4 ${isSelected ? 'border-primary bg-primary/5' : 'border-l-orange-400'}`}>
            {/* Status Indicator Color Override */}
            {!isSelected && isWaiting && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
            {!isSelected && isCompleted && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}

            {/* Batch Selection Overlay/Checkbox */}
            {onToggleSelect && (
                <div className={`absolute top-3 right-3 z-50 ${!selectionMode && 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity'}`}>
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onToggleSelect(purchase.id, checked as boolean)}
                        className="h-5 w-5 bg-white data-[state=checked]:bg-primary"
                    />
                </div>
            )}

            <div className={`flex justify-between items-start ${isSelected ? 'opacity-100' : ''}`}>
                <div>
                    <h4 className="font-bold text-sm leading-tight pr-6">
                        {purchase.friendly_id && <span className="text-muted-foreground mr-1">#{purchase.friendly_id}</span>}
                        {purchase.item}
                    </h4>
                    <p className="text-xs text-muted-foreground">Pedinte: {purchase.requester ? purchase.requester.split('@')[0].slice(-4) : '?'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 z-10">
                    <Badge variant={isCompleted ? "default" : "outline"} className="text-[10px] h-5">
                        {isPending && "A Comprar"}
                        {isWaiting && "A Chegar"}
                        {isCompleted && "Ok"}
                    </Badge>
                </div>
            </div>

            {/* Details if purchased */}
            {(isWaiting || isCompleted) && (
                <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                    <div className="flex justify-between">
                        <span>Qtd: {purchase.quantity}</span>
                        <span className="font-bold">R$ {purchase.amount?.toFixed(2)}</span>
                    </div>
                    {purchase.receipt_url && !isSelected && (
                        <a href={purchase.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-[10px] block">
                            📄 Ver Comprovante
                        </a>
                    )}
                </div>
            )}

            {/* Actions (Hidden/Disabled while selecting multiple to avoid confusion) */}
            <div className={`flex justify-between items-center pt-1 mt-auto ${selectionMode ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-700 hover:bg-red-50"
                        title="Excluir"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Excluir este item?')) onDelete(purchase.id);
                        }}
                    >
                        <Trash2 size={16} />
                    </Button>
                    {(isWaiting || isCompleted) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-400 hover:text-blue-700 hover:bg-blue-50"
                            title="Reenviar Notificação WhatsApp"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Reenviar notificação no WhatsApp?')) onResendNotification(purchase.id);
                            }}
                        >
                            <Bell size={16} />
                        </Button>
                    )}
                </div>

                <div className="flex-1 flex justify-end">
                    {isPending && (
                        <Button size="sm" variant="secondary" className="h-7 text-xs w-full ml-2 bg-orange-100 text-orange-700 hover:bg-orange-200" onClick={() => onRegisterBuy(purchase)}>
                            <ShoppingCart size={14} className="mr-1" />
                            Comprar
                        </Button>
                    )}
                    {isWaiting && (
                        <Button size="sm" variant="secondary" className="h-7 text-xs w-full ml-2 bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => onConfirmReceive(purchase)}>
                            <CheckCircle2 size={14} className="mr-1" />
                            Recebido
                        </Button>
                    )}
                    {isCompleted && (
                        <div className="flex items-center text-green-600 text-xs font-medium px-2">
                            <CheckCircle2 size={14} className="mr-1" />
                            Entregue
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
