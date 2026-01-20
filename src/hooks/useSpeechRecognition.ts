
import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechRecognition = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isFinal, setIsFinal] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Keep track if we manually stopped
    const manuallyStopped = useRef(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                const reco = new SpeechRecognition();
                reco.continuous = false;
                reco.interimResults = true;
                reco.lang = 'pt-BR';

                reco.onstart = () => {
                    console.log("Speech recognition started (event)");
                    setIsListening(true);
                    setError(null);
                    setIsFinal(false);
                    manuallyStopped.current = false;
                };

                reco.onend = () => {
                    console.log("Speech recognition ended (event)");
                    setIsListening(false);
                };

                reco.onresult = (event: any) => {
                    let final = '';
                    let interim = '';
                    let hasFinal = false;

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                            hasFinal = true;
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }

                    const text = final || interim;
                    // console.log("Transcript updated:", text, "IsFinal:", hasFinal);
                    setTranscript(text);

                    if (hasFinal) {
                        setIsFinal(true);
                    }
                };

                reco.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error);
                    let msg = event.error;
                    if (event.error === 'not-allowed') msg = "Permissão de microfone negada. Clique no cadeado 🔒 na barra de endereço.";
                    if (event.error === 'no-speech') msg = "Não ouvi nada (no-speech).";
                    if (event.error === 'network') msg = "Erro de rede no reconhecimento de voz.";
                    if (event.error === 'aborted') return;

                    setError(msg);
                    setIsListening(false);
                };

                setRecognition(reco);
            } else {
                console.warn("Speech Recognition API not supported in this browser");
                setError("Seu navegador não suporta reconhecimento de voz.");
            }
        }
    }, []);

    const startListening = useCallback(() => {
        setTranscript('');
        setIsFinal(false);
        setError(null);
        manuallyStopped.current = false;

        // Optimistically set listening to TRUE to prevent UI race conditions
        setIsListening(true);

        if (recognition) {
            try {
                recognition.start();
            } catch (e) {
                console.error("Error calling start():", e);
                setIsListening(false);
            }
        } else {
            setIsListening(false);
        }
    }, [recognition]);

    const stopListening = useCallback(() => {
        manuallyStopped.current = true;
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.error("Error calling stop():", e);
            }
        }
    }, [recognition]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setIsFinal(false);
    }, []);

    return { isListening, transcript, isFinal, startListening, stopListening, resetTranscript, error, hasSupport: !!recognition };
};
