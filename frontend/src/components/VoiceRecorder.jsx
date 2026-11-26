import React, { useState, useRef, useEffect } from 'react';
import { authFetch } from '../utils/api.js';

export default function VoiceRecorder({ onEntryCreated, onClose, isModal = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setTimerSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta la grabación de audio en vivo.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detectar tipo mime soportado
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Formato por defecto del navegador
          }
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });
        await sendAudioToBackend(audioBlob);
      };

      recorder.start(250); // Emitir chunks cada 250ms
      setIsRecording(true);
      setIsPaused(false);

      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado. Puedes usar la opción de dictado escrito abajo.'
          : `Error al acceder al micrófono: ${err.message}`
      );
      setShowManualInput(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (!isPaused) {
        mediaRecorderRef.current.pause();
        clearInterval(timerIntervalRef.current);
        setIsPaused(true);
      } else {
        mediaRecorderRef.current.resume();
        timerIntervalRef.current = setInterval(() => {
          setTimerSeconds((prev) => prev + 1);
        }, 1000);
        setIsPaused(false);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerIntervalRef.current);
      mediaRecorderRef.current.stop();
      stopTracks();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setTimerSeconds(0);
    if (onClose) onClose();
  };

  const sendAudioToBackend = async (blob) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'nota_voz.webm');
      formData.append('duracion', timerSeconds.toString());

      const res = await authFetch('/api/procesar-voz', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el audio en el servidor.');
      }

      if (onEntryCreated) onEntryCreated(data.data);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error procesando voz:', err);
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
      setTimerSeconds(0);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('texto', manualText.trim());

      const res = await authFetch('/api/procesar-voz', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar la entrada.');
      }

      setManualText('');
      if (onEntryCreated) onEntryCreated(data.data);
      if (onClose) onClose();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimer = (sec) => {
    const mins = String(Math.floor(sec / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // VISTA DE GRABACIÓN ACTIVA O PROCESANDO
  if (isRecording || isProcessing) {
    return (
      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-md border border-primary/20 space-y-6 transition-all duration-300">
        {/* Top Status & Timer Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-surface-container px-4 py-1.5 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-outline' : 'bg-primary animate-ping opacity-75'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPaused ? 'bg-outline' : 'bg-primary'}`}></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {isProcessing ? 'Procesando con Gemini' : isPaused ? 'Pausado' : 'Escuchando en vivo'}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="text-xs font-mono font-medium text-on-surface-variant">
              {formatTimer(timerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isProcessing && (
              <>
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface"
                  title={isPaused ? 'Reanudar' : 'Pausar'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-error-container text-on-surface hover:text-on-error-container flex items-center justify-center transition-colors"
                  title="Cancelar"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Acoustic Waveform Canvas */}
        <div className="relative w-full h-24 bg-surface-container-low rounded-xl flex items-center justify-center overflow-hidden px-4">
          <div className="flex items-center justify-center gap-1.5 w-full h-full">
            {[16, 28, 44, 60, 36, 75, 48, 85, 52, 38, 24, 18, 30, 50, 20].map((height, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full transition-all duration-150 ${isPaused
                    ? 'h-2 bg-outline-variant'
                    : isProcessing
                      ? 'h-4 bg-primary-container animate-pulse'
                      : 'bg-primary'
                  }`}
                style={{
                  height: !isPaused && !isProcessing ? `${Math.max(8, (height * (timerSeconds % 3 + 1)) % 70)}px` : undefined,
                  transitionDelay: `${i * 30}ms`
                }}
              ></span>
            ))}
          </div>
          <div className="absolute bottom-2 right-3 flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
            <span className="material-symbols-outlined text-[13px] text-primary">graphic_eq</span>
            <span>44.1 kHz • Audio HD</span>
          </div>
        </div>

        {/* Action Button: Stop and Save */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2">
          {isProcessing ? (
            <div className="flex items-center gap-3 text-primary font-medium text-sm">
              <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
              <span>Gemini 2.5 Flash estructurando tu bitácora técnica...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="relative group flex items-center justify-center w-16 h-16 rounded-full bg-primary text-on-primary shadow-lg active:scale-95 transition-all hover:bg-primary-container"
              title="Toca para finalizar y procesar con IA"
            >
              <span className="material-symbols-outlined text-[30px]">stop</span>
              <span className="absolute -bottom-6 text-xs text-on-surface-variant font-medium whitespace-nowrap">
                Toca para finalizar
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // VISTA INICIAL (CARD TIPO HERO DE STITCH)
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30 transition-all duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={startRecording}
            className="relative group shrink-0 w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md hover:bg-primary"
            aria-label="Iniciar dictado por voz"
          >
            <span className="material-symbols-outlined text-[26px]">mic</span>
            <span className="absolute inset-0 rounded-full bg-primary-fixed-dim/30 animate-ping pointer-events-none opacity-40"></span>
          </button>
          <div className="flex flex-col min-w-0">
            <p className="font-semibold text-lg text-on-surface truncate">
              ¿Qué realizaste en tu pasantía hoy?
            </p>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
              <span>Habla con naturalidad y Gemini 2.5 Flash redactará tu informe técnico</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showManualInput ? 'mic' : 'edit_note'}
            </span>
            <span>{showManualInput ? 'Modo Voz' : 'Escribir manual'}</span>
          </button>

          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-on-surface text-surface hover:bg-primary-container hover:text-on-primary transition-all duration-200 text-xs font-medium active:scale-95 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">mic</span>
            <span>Comenzar a hablar</span>
          </button>
        </div>
      </div>

      {/* Formulario de texto manual de respaldo */}
      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-outline-variant/30 flex flex-col gap-3">
          <label className="text-xs font-medium text-on-surface-variant">
            Describe lo que hiciste hoy (Gemini lo redactará técnicamente):
          </label>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={3}
            placeholder="Ej: Hoy configuré los endpoints de la API en Node.js, corregí un error con SQLite en Node 25 y probé la subida de archivos..."
            className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant/50 text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowManualInput(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!manualText.trim() || isProcessing}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50"
            >
              {isProcessing ? 'Procesando...' : 'Procesar con IA'}
            </button>
          </div>
        </form>
      )}

      {errorMessage && (
        <div className="mt-3 p-3 bg-error-container text-on-error-container rounded-xl text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

