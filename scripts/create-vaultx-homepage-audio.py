import math
import wave
import struct
from pathlib import Path

out_dir = Path('public/audio')
out_dir.mkdir(parents=True, exist_ok=True)
out_path = out_dir / 'vaultx-homepage-pulse.wav'

sample_rate = 44100
duration = 9.0
frames = int(sample_rate * duration)

# A restrained dark ambient pulse bed: low sub pulse + soft fifth + slow swell.
with wave.open(str(out_path), 'w') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sample_rate)
    for i in range(frames):
        t = i / sample_rate
        beat = (math.sin(2 * math.pi * 1.35 * t) + 1) / 2
        gate = 0.28 + 0.72 * (beat ** 3)
        fade_in = min(1.0, t / 1.5)
        fade_out = min(1.0, (duration - t) / 1.2)
        env = 0.20 * fade_in * fade_out
        sub = math.sin(2 * math.pi * 55.0 * t) * 0.55
        fifth = math.sin(2 * math.pi * 82.41 * t + 0.2) * 0.22
        shimmer = math.sin(2 * math.pi * 220.0 * t + math.sin(2 * math.pi * 0.18 * t)) * 0.06
        sample = (sub * gate + fifth + shimmer) * env
        left = int(max(-1, min(1, sample)) * 32767)
        right_sample = sample * (0.92 + 0.08 * math.sin(2 * math.pi * 0.11 * t))
        right = int(max(-1, min(1, right_sample)) * 32767)
        wf.writeframes(struct.pack('<hh', left, right))

print(out_path)
