import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Server, Smartphone, ScanLine } from "lucide-react";
import { toast } from "sonner";

export function BotStatusConfig() {
    const [status, setStatus] = useState<'initializing' | 'scan_qr' | 'ready' | 'authenticated' | 'disconnected'>('initializing');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Determines API URL (Environment Aware)
    const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3005';

    const checkStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/status`);
            if (!response.ok) throw new Error('Falha na conexão');

            const data = await response.json();
            setStatus(data.status);
            setQrCode(data.qr);
        } catch (error) {
            console.error(error);
            setStatus('disconnected');
            // toast.error("Não foi possível conectar ao Bot");
        } finally {
            setLoading(false);
        }
    };

    // Poll status when modal is open
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (open) {
            checkStatus();
            interval = setInterval(checkStatus, 3000); // Poll every 3s
        }
        return () => clearInterval(interval);
    }, [open]);

    // QR Code Image URL (Using Public API to avoid dependencies)
    const qrImageUrl = qrCode
        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`
        : null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    {status === 'ready' || status === 'authenticated' ? (
                        <span className="flex items-center gap-1 text-green-600">
                            <Smartphone className="h-4 w-4" /> Conectado
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-orange-600">
                            <ScanLine className="h-4 w-4" /> Conectar Bot
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Status do WhatsApp Bot
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-6 space-y-4">

                    {/* STATUS INDICATOR */}
                    <div className="flex items-center gap-2 text-sm font-medium">
                        Status atual:
                        <span className={`px-2 py-1 rounded-full text-xs uppercase ${status === 'ready' || status === 'authenticated' ? 'bg-green-100 text-green-700' :
                                status === 'scan_qr' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                            }`}>
                            {status === 'scan_qr' ? 'Aguardando Leitura' :
                                status === 'ready' ? 'Pronto para uso' :
                                    status === 'authenticated' ? 'Autenticado' :
                                        'Desconectado / Iniciando'}
                        </span>
                    </div>

                    {/* QR CODE DISPLAY */}
                    {status === 'scan_qr' && qrImageUrl && (
                        <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                            <div className="border-4 border-white shadow-lg rounded-lg overflow-hidden">
                                <img src={qrImageUrl} alt="QR Code WhatsApp" className="w-[250px] h-[250px]" />
                            </div>
                            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                                Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar Aparelho
                            </p>
                        </div>
                    )}

                    {/* LOADING / WAITING STATE */}
                    {status === 'initializing' && (
                        <div className="flex flex-col items-center py-8 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p className="text-sm">Iniciando serviços...</p>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {(status === 'ready' || status === 'authenticated') && (
                        <div className="flex flex-col items-center py-8 text-green-600">
                            <Smartphone className="h-12 w-12 mb-2" />
                            <p className="font-bold">WhatsApp Conectado!</p>
                            <p className="text-xs text-muted-foreground">Você já pode fechar esta janela.</p>
                        </div>
                    )}

                    <Button variant="ghost" size="sm" onClick={checkStatus} disabled={loading}>
                        <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar Status
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
