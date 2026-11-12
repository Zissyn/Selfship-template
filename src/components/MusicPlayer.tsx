import React, { useEffect, useRef, useState } from 'react';
import { CardData } from '../types/album';
import { openAudioPicker } from '../utils/imageUtils';

interface MusicPlayerProps {
  card: CardData;
  onChange: (updated: Partial<CardData>) => void;
  onCoverClick: () => void;
  onToast: (msg: string) => void;
}

const NBARS = 30;

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  card,
  onChange,
  onCoverClick,
  onToast,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize or update audio element
  useEffect(() => {
    if (!audioRef.current) {
      const aud = new Audio();
      aud.volume = volume;
      aud.addEventListener('timeupdate', () => {
        setCurrentTime(aud.currentTime || 0);
      });
      aud.addEventListener('loadedmetadata', () => {
        setDuration(aud.duration || 0);
      });
      aud.addEventListener('durationchange', () => {
        setDuration(aud.duration || 0);
      });
      aud.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      aud.addEventListener('play', () => setIsPlaying(true));
      aud.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current = aud;
    }
  }, []);

  // Update volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const handlePickAudio = () => {
    openAudioPicker(
      async (file) => {
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        const newUrl = URL.createObjectURL(file);
        setAudioUrl(newUrl);

        if (audioRef.current) {
          audioRef.current.src = newUrl;
          audioRef.current.load();
        }

        const songName = file.name.replace(/\.[^.]+$/, '').slice(0, 50);
        if (!card.pt) {
          onChange({ pt: songName });
        }

        onToast(`Canción cargada: ${songName}`);

        // Try extracting waveform peaks using Web Audio API
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            ctx.close();

            const channelData = audioBuffer.getChannelData(0);
            const step = Math.floor(channelData.length / NBARS);
            const rawPeaks: number[] = [];

            for (let i = 0; i < NBARS; i++) {
              let max = 0;
              for (let j = i * step; j < (i + 1) * step; j += Math.max(1, step >> 9)) {
                max = Math.max(max, Math.abs(channelData[j]));
              }
              rawPeaks.push(max);
            }
            const highest = Math.max(...rawPeaks) || 1;
            const normalized = rawPeaks.map((v) => Math.max(0.18, v / highest));
            setPeaks(normalized);
          }
        } catch {
          // Fallback to seeded peaks
        }
      },
      (err) => onToast(err)
    );
  };

  const togglePlay = () => {
    if (!audioUrl || !audioRef.current) {
      handlePickAudio();
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {
        onToast('No se pudo reproducir este archivo de audio.');
      });
    } else {
      audioRef.current.pause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = duration * ratio;
  };

  const handleRewind = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const handleForward = () => {
    if (audioRef.current && duration) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    }
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Compute waveform bars heights
  const bars = peaks || (() => {
    let hash = 0;
    for (const ch of card.id || 'seed') {
      hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return Array.from({ length: NBARS }, (_, i) => {
      hash = (hash * 1664525 + 1013904223) >>> 0;
      const r = hash / 4294967296;
      return Math.max(
        0.18,
        Math.min(1, (0.5 + 0.5 * Math.sin(((i + 0.5) / NBARS) * Math.PI)) * (0.35 + 0.65 * r))
      );
    });
  })();

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBarsCount = Math.round(progress * NBARS);

  return (
    <div
      className="absolute z-10"
      style={{
        left: 'calc(var(--px) * 124)',
        top: 'calc(var(--px) * 892)',
        width: 'calc(var(--px) * 470)',
        height: 'calc(var(--px) * 186)',
        color: 'var(--ink)',
      }}
    >
      {/* Background card with border */}
      <div
        className="absolute inset-0 rounded-[calc(var(--px)*40)] shadow-lg"
        style={{
          background: 'var(--card)',
          border: 'calc(var(--px)*5) solid var(--ink)',
          boxShadow:
            '0 0 0 calc(var(--px)*8) #ffffff, 0 calc(var(--px)*7) calc(var(--px)*14) rgba(0,0,0,0.2)',
        }}
      >
        <div
          className="absolute inset-[calc(var(--px)*8)] rounded-[calc(var(--px)*30)] pointer-events-none"
          style={{
            border: 'calc(var(--px)*2) dashed var(--acc)',
          }}
        />
      </div>

      {/* Cover image disk */}
      <button
        type="button"
        onClick={onCoverClick}
        title="Cambiar portada de la canción (Haz clic para subir imagen)"
        className="absolute rounded-full overflow-hidden flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
        style={{
          left: 'calc(var(--px) * 14)',
          top: 'calc(var(--px) * 20)',
          width: 'calc(var(--px) * 92)',
          height: 'calc(var(--px) * 92)',
          border: 'calc(var(--px) * 4) solid var(--ink)',
          background: 'var(--lav)',
          backgroundImage: card.pc ? `url(${card.pc})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!card.pc && (
          <svg className="w-1/2 h-1/2 text-[var(--ink)]" viewBox="0 0 100 100">
            <ellipse cx="50" cy="68" rx="24" ry="19" fill="currentColor" />
            <circle cx="20" cy="42" r="10" fill="currentColor" />
            <circle cx="39" cy="24" r="11" fill="currentColor" />
            <circle cx="61" cy="24" r="11" fill="currentColor" />
            <circle cx="80" cy="42" r="10" fill="currentColor" />
          </svg>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[calc(var(--px)*20)]">
          📷
        </div>
      </button>

      {/* Audio badge picker */}
      <button
        type="button"
        onClick={handlePickAudio}
        title="Elegir o cambiar archivo de audio (MP3, WAV, etc.)"
        className="absolute rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90"
        style={{
          left: 'calc(var(--px) * 10)',
          top: 'calc(var(--px) * 86)',
          width: 'calc(var(--px) * 36)',
          height: 'calc(var(--px) * 36)',
          background: 'var(--acc)',
          border: 'calc(var(--px) * 3) solid var(--ink)',
        }}
      >
        <svg className="w-[58%] h-[58%]" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 9v6M9.5 5v14M14.5 8v8M19 10.5v3"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Song Title Input */}
      <input
        type="text"
        value={card.pt || ''}
        onChange={(e) => onChange({ pt: e.target.value })}
        placeholder="Nombre de la canción…"
        maxLength={50}
        aria-label="Nombre de la canción"
        className="absolute bg-transparent border-0 outline-none font-[var(--ff)] text-[calc(var(--px)*27)] focus:bg-white/40 rounded-md px-1"
        style={{
          left: 'calc(var(--px) * 118)',
          top: 'calc(var(--px) * 14)',
          width: 'calc(var(--px) * 336)',
          height: 'calc(var(--px) * 32)',
          color: 'var(--ink)',
          fontFamily: `'${card.fontFamily || card.font || 'Patrick Hand'}', cursive, system-ui, sans-serif`,
        }}
      />

      {/* Waveform Scrubber */}
      <div
        onClick={handleSeek}
        title="Haz clic para avanzar o retroceder"
        className="absolute flex items-center gap-[calc(var(--px)*3)] cursor-pointer py-1"
        style={{
          left: 'calc(var(--px) * 122)',
          top: 'calc(var(--px) * 52)',
          width: 'calc(var(--px) * 330)',
          height: 'calc(var(--px) * 38)',
        }}
      >
        {bars.map((v, idx) => (
          <i
            key={idx}
            className="flex-1 min-w-0 rounded-full transition-colors"
            style={{
              height: `${Math.round(v * 100)}%`,
              backgroundColor: idx < activeBarsCount ? 'var(--ink)' : 'var(--lav)',
            }}
          />
        ))}
      </div>

      {/* Time indicators */}
      <span
        className="absolute text-[calc(var(--px)*21)] leading-[calc(var(--px)*22)] font-mono tabular-nums"
        style={{
          left: 'calc(var(--px) * 122)',
          top: 'calc(var(--px) * 96)',
          width: 'calc(var(--px) * 80)',
          color: 'var(--ink)',
        }}
      >
        {formatTime(currentTime)}
      </span>
      <span
        className="absolute text-[calc(var(--px)*21)] leading-[calc(var(--px)*22)] font-mono tabular-nums text-right"
        style={{
          left: 'calc(var(--px) * 372)',
          top: 'calc(var(--px) * 96)',
          width: 'calc(var(--px) * 80)',
          color: 'var(--ink)',
        }}
      >
        {formatTime(duration)}
      </span>

      {/* Like Heart Button */}
      <button
        type="button"
        onClick={() => onChange({ lk: !card.lk })}
        title={card.lk ? 'Quitar Me gusta' : 'Dar Me gusta'}
        className="absolute flex items-center justify-center cursor-pointer transition-transform hover:scale-115 active:scale-95"
        style={{
          left: 'calc(var(--px) * 30)',
          top: 'calc(var(--px) * 128)',
          width: 'calc(var(--px) * 44)',
          height: 'calc(var(--px) * 44)',
        }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 24 24"
          fill={card.lk ? '#e0678f' : 'none'}
          stroke={card.lk ? '#e0678f' : 'currentColor'}
          strokeWidth="2"
        >
          <path d="M12 21C5 15.5 2.5 12 2.5 8.5 2.5 6 4.5 4 7 4c2 0 3.8 1.2 5 3 1.2-1.8 3-3 5-3 2.5 0 4.5 2 4.5 4.5C21.5 12 19 15.5 12 21z" />
        </svg>
      </button>

      {/* Rewind 10s */}
      <button
        type="button"
        onClick={handleRewind}
        title="Retroceder 10 segundos"
        className="absolute flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90"
        style={{
          left: 'calc(var(--px) * 143)',
          top: 'calc(var(--px) * 128)',
          width: 'calc(var(--px) * 44)',
          height: 'calc(var(--px) * 44)',
        }}
      >
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 6v12L2.5 12zM21 6v12l-8.5-6z" />
        </svg>
      </button>

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        title={isPlaying ? 'Pausar' : audioUrl ? 'Reproducir' : 'Elegir archivo y reproducir'}
        className="absolute rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-110 active:scale-95"
        style={{
          left: 'calc(var(--px) * 209)',
          top: 'calc(var(--px) * 122)',
          width: 'calc(var(--px) * 52)',
          height: 'calc(var(--px) * 52)',
          background: 'var(--ink)',
          color: 'var(--card)',
        }}
      >
        {isPlaying ? (
          <svg className="w-[56%] h-[56%]" viewBox="0 0 24 24">
            <path d="M7 5v14M17 5v14" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-[56%] h-[56%]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 4.5v15l13-7.5z" />
          </svg>
        )}
      </button>

      {/* Forward 10s */}
      <button
        type="button"
        onClick={handleForward}
        title="Adelantar 10 segundos"
        className="absolute flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90"
        style={{
          left: 'calc(var(--px) * 283)',
          top: 'calc(var(--px) * 128)',
          width: 'calc(var(--px) * 44)',
          height: 'calc(var(--px) * 44)',
        }}
      >
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 6v12l8.5-6zM3 6v12l8.5-6z" />
        </svg>
      </button>

      {/* Volume icon */}
      <span
        className="absolute flex items-center justify-center pointer-events-none"
        style={{
          left: 'calc(var(--px) * 352)',
          top: 'calc(var(--px) * 139)',
          width: 'calc(var(--px) * 22)',
          height: 'calc(var(--px) * 22)',
        }}
      >
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 4V5L7 9z" />
          <path
            d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {/* Volume slider */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={handleVolumeChange}
        aria-label="Volumen del reproductor"
        className="absolute cursor-pointer"
        style={{
          left: 'calc(var(--px) * 378)',
          top: 'calc(var(--px) * 139)',
          width: 'calc(var(--px) * 76)',
          height: 'calc(var(--px) * 22)',
          accentColor: 'var(--ink)',
        }}
      />
    </div>
  );
};
