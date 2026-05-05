import { useState, useCallback } from "react";

export interface Clip {
  id: string;
  assetUrl?: string;
  src?: string;
  url?: string;
  sourceUrl?: string;
  name?: string;
  duration?: number;
  startTime?: number;
  endTime?: number;
  trimStart?: number;
  trimEnd?: number;
  volume?: number;
  order?: number;
}

export interface TextLayer {
  id: string;
  text: string;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  startTime?: number;
  endTime?: number;
  style?: string;
}

export interface AudioTrack {
  id: string;
  src?: string;
  url?: string;
  name?: string;
  volume?: number;
  startTime?: number;
  endTime?: number;
  loop?: boolean;
}

export interface ColorGrade {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  temperature?: number;
  lut?: string | null;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useVideoEditor(_projectId?: string | null) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [colorGrade, setColorGrade] = useState<ColorGrade>({
    brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0, lut: null,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(null);
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const addClip = useCallback((clip: Partial<Clip>) => {
    const newClip: Clip = { id: generateId(), order: 0, volume: 1, trimStart: 0, trimEnd: clip.duration ?? 0, ...clip };
    setClips(prev => { newClip.order = prev.length; return [...prev, newClip]; });
    setSelectedClipId(newClip.id);
    return newClip;
  }, []);

  const removeClip = useCallback((id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
    setSelectedClipId(prev => prev === id ? null : prev);
  }, []);

  const updateClip = useCallback((id: string, updates: Partial<Clip>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const reorderClips = useCallback((fromIndex: number, toIndex: number) => {
    setClips(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr.map((c, i) => ({ ...c, order: i }));
    });
  }, []);

  const splitClip = useCallback((id: string, atTime: number) => {
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const clip = prev[idx];
      const first: Clip = { ...clip, id: generateId(), trimEnd: atTime };
      const second: Clip = { ...clip, id: generateId(), trimStart: atTime };
      const arr = [...prev];
      arr.splice(idx, 1, first, second);
      return arr;
    });
  }, []);

  const addTextLayer = useCallback((layer: Partial<TextLayer>) => {
    const newLayer: TextLayer = { id: generateId(), text: "New Text", x: 50, y: 50, fontSize: 32, color: "#ffffff", fontFamily: "Inter", ...layer };
    setTextLayers(prev => [...prev, newLayer]);
    setSelectedTextLayerId(newLayer.id);
    return newLayer;
  }, []);

  const removeTextLayer = useCallback((id: string) => {
    setTextLayers(prev => prev.filter(t => t.id !== id));
    setSelectedTextLayerId(prev => prev === id ? null : prev);
  }, []);

  const updateTextLayer = useCallback((id: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const addAudioTrack = useCallback((track: Partial<AudioTrack>) => {
    const newTrack: AudioTrack = { id: generateId(), volume: 0.8, loop: false, ...track };
    setAudioTracks(prev => [...prev, newTrack]);
    setSelectedAudioTrackId(newTrack.id);
    return newTrack;
  }, []);

  const removeAudioTrack = useCallback((id: string) => {
    setAudioTracks(prev => prev.filter(a => a.id !== id));
    setSelectedAudioTrackId(prev => prev === id ? null : prev);
  }, []);

  const updateAudioTrack = useCallback((id: string, updates: Partial<AudioTrack>) => {
    setAudioTracks(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const updateColorGrade = useCallback((updates: Partial<ColorGrade>) => {
    setColorGrade(prev => ({ ...prev, ...updates }));
  }, []);

  const togglePlayPause = useCallback(() => setIsPlaying(prev => !prev), []);
  const seek = useCallback((time: number) => setCurrentTime(Math.max(0, time)), []);
  const setVolumeLevel = useCallback((v: number) => setVolume(Math.max(0, Math.min(1, v))), []);
  const selectClip = useCallback((id: string | null) => setSelectedClipId(id), []);
  const selectTextLayer = useCallback((id: string | null) => setSelectedTextLayerId(id), []);
  const selectAudioTrack = useCallback((id: string | null) => setSelectedAudioTrackId(id), []);

  const saveProject = useCallback(async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
  }, []);

  return {
    clips, textLayers, audioTracks, colorGrade,
    currentTime, isPlaying, duration, volume,
    selectedClipId, selectedTextLayerId, selectedAudioTrackId,
    addClip, removeClip, updateClip, reorderClips, splitClip,
    addTextLayer, removeTextLayer, updateTextLayer,
    addAudioTrack, removeAudioTrack, updateAudioTrack,
    updateColorGrade, togglePlayPause, seek,
    setVolume: setVolumeLevel, setCurrentTime,
    selectClip, selectTextLayer, selectAudioTrack,
    saveProject, isSaving, isLoading, error,
  };
}

export default useVideoEditor;
