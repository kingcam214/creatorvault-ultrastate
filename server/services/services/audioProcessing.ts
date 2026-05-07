/**
 * Audio Processing Service
 * Handles audio enhancement, normalization, and format conversion
 * 
 * Note: Advanced audio processing (noise cancellation, echo reduction) is best done
 * client-side using Web Audio API for real-time processing during recording.
 * This service handles server-side post-processing and format conversion.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export interface AudioProcessingOptions {
  normalize?: boolean; // Normalize audio levels
  removeNoise?: boolean; // Basic noise reduction
  compressAudio?: boolean; // Dynamic range compression
  targetFormat?: "mp3" | "wav" | "ogg"; // Output format
  bitrate?: string; // e.g., "128k", "192k", "320k"
}

export interface AudioMetadata {
  duration: number; // seconds
  format: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
  fileSize: number; // bytes
}

/**
 * Process audio file with various enhancements
 * Requires ffmpeg to be installed on the system
 */
export async function processAudio(
  audioBuffer: Buffer,
  options: AudioProcessingOptions = {}
): Promise<{ processedBuffer: Buffer; metadata: AudioMetadata }> {
  const tempInputPath = path.join(os.tmpdir(), `input-${randomUUID()}.mp3`);
  const tempOutputPath = path.join(os.tmpdir(), `output-${randomUUID()}.${options.targetFormat || "mp3"}`);

  try {
    // Write input buffer to temp file
    await writeFile(tempInputPath, audioBuffer);

    // Build ffmpeg command
    const filters: string[] = [];

    if (options.normalize) {
      // Loudness normalization (EBU R128)
      filters.push("loudnorm=I=-16:TP=-1.5:LRA=11");
    }

    if (options.removeNoise) {
      // Basic high-pass filter to remove low-frequency noise
      filters.push("highpass=f=200");
    }

    if (options.compressAudio) {
      // Dynamic range compression
      filters.push("acompressor=threshold=-20dB:ratio=4:attack=5:release=50");
    }

    const filterComplex = filters.length > 0 ? `-af "${filters.join(",")}"` : "";
    const bitrate = options.bitrate || "192k";
    const format = options.targetFormat || "mp3";

    // Execute ffmpeg
    const command = `ffmpeg -i "${tempInputPath}" ${filterComplex} -b:a ${bitrate} -f ${format} "${tempOutputPath}" -y`;
    await execAsync(command);

    // Get metadata
    const metadataCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${tempOutputPath}"`;
    const { stdout } = await execAsync(metadataCommand);
    const probeData = JSON.parse(stdout);

    const audioStream = probeData.streams.find((s: any) => s.codec_type === "audio");
    const metadata: AudioMetadata = {
      duration: parseFloat(probeData.format.duration),
      format: probeData.format.format_name,
      bitrate: parseInt(probeData.format.bit_rate),
      sampleRate: parseInt(audioStream.sample_rate),
      channels: audioStream.channels,
      fileSize: parseInt(probeData.format.size),
    };

    // Read processed file
    const processedBuffer = await require("fs/promises").readFile(tempOutputPath);

    return { processedBuffer, metadata };
  } finally {
    // Cleanup temp files
    try {
      await unlink(tempInputPath);
      await unlink(tempOutputPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Extract audio metadata without processing
 */
export async function getAudioMetadata(audioBuffer: Buffer): Promise<AudioMetadata> {
  const tempPath = path.join(os.tmpdir(), `probe-${randomUUID()}.mp3`);

  try {
    await writeFile(tempPath, audioBuffer);

    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${tempPath}"`;
    const { stdout } = await execAsync(command);
    const probeData = JSON.parse(stdout);

    const audioStream = probeData.streams.find((s: any) => s.codec_type === "audio");

    return {
      duration: parseFloat(probeData.format.duration),
      format: probeData.format.format_name,
      bitrate: parseInt(probeData.format.bit_rate),
      sampleRate: parseInt(audioStream.sample_rate),
      channels: audioStream.channels,
      fileSize: parseInt(probeData.format.size),
    };
  } finally {
    try {
      await unlink(tempPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Extract audio clip from episode
 * Used for creating social media snippets
 */
export async function extractAudioClip(
  audioBuffer: Buffer,
  startTime: number, // seconds
  duration: number // seconds
): Promise<Buffer> {
  const tempInputPath = path.join(os.tmpdir(), `clip-input-${randomUUID()}.mp3`);
  const tempOutputPath = path.join(os.tmpdir(), `clip-output-${randomUUID()}.mp3`);

  try {
    await writeFile(tempInputPath, audioBuffer);

    // Extract clip with ffmpeg
    const command = `ffmpeg -i "${tempInputPath}" -ss ${startTime} -t ${duration} -c copy "${tempOutputPath}" -y`;
    await execAsync(command);

    const clipBuffer = await require("fs/promises").readFile(tempOutputPath);
    return clipBuffer;
  } finally {
    try {
      await unlink(tempInputPath);
      await unlink(tempOutputPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convert audio to different format
 */
export async function convertAudioFormat(
  audioBuffer: Buffer,
  targetFormat: "mp3" | "wav" | "ogg" | "m4a",
  bitrate: string = "192k"
): Promise<Buffer> {
  const tempInputPath = path.join(os.tmpdir(), `convert-input-${randomUUID()}.mp3`);
  const tempOutputPath = path.join(os.tmpdir(), `convert-output-${randomUUID()}.${targetFormat}`);

  try {
    await writeFile(tempInputPath, audioBuffer);

    const command = `ffmpeg -i "${tempInputPath}" -b:a ${bitrate} "${tempOutputPath}" -y`;
    await execAsync(command);

    const convertedBuffer = await require("fs/promises").readFile(tempOutputPath);
    return convertedBuffer;
  } finally {
    try {
      await unlink(tempInputPath);
      await unlink(tempOutputPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Generate waveform data for visualization
 * Returns array of amplitude values (0-1) for rendering waveform
 */
export async function generateWaveformData(audioBuffer: Buffer, samples: number = 1000): Promise<number[]> {
  const tempPath = path.join(os.tmpdir(), `waveform-${randomUUID()}.mp3`);

  try {
    await writeFile(tempPath, audioBuffer);

    // Use ffmpeg to extract audio data
    const command = `ffmpeg -i "${tempPath}" -f f32le -ac 1 -ar 8000 pipe:1`;
    const { stdout } = await execAsync(command, { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 });

    // Parse float32 audio data
    const floatArray = new Float32Array(stdout.buffer);

    // Downsample to requested number of samples
    const step = Math.floor(floatArray.length / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * step;
      const end = Math.min(start + step, floatArray.length);

      // Calculate RMS (root mean square) for this segment
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += floatArray[j] * floatArray[j];
      }
      const rms = Math.sqrt(sum / (end - start));

      waveform.push(Math.min(rms, 1.0)); // Clamp to 0-1
    }

    return waveform;
  } catch (error) {
    console.error("Waveform generation error:", error);
    // Return flat waveform on error
    return new Array(samples).fill(0.5);
  } finally {
    try {
      await unlink(tempPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Client-side audio processing guidance
 * 
 * For real-time noise cancellation and echo reduction during recording,
 * use Web Audio API in the browser:
 * 
 * ```typescript
 * // Get user media with noise suppression
 * const stream = await navigator.mediaDevices.getUserMedia({
 *   audio: {
 *     echoCancellation: true,
 *     noiseSuppression: true,
 *     autoGainControl: true,
 *   }
 * });
 * 
 * // Create audio context
 * const audioContext = new AudioContext();
 * const source = audioContext.createMediaStreamSource(stream);
 * 
 * // Add filters
 * const highpass = audioContext.createBiquadFilter();
 * highpass.type = 'highpass';
 * highpass.frequency.value = 200; // Remove low-frequency noise
 * 
 * const compressor = audioContext.createDynamicsCompressor();
 * compressor.threshold.value = -50;
 * compressor.knee.value = 40;
 * compressor.ratio.value = 12;
 * compressor.attack.value = 0;
 * compressor.release.value = 0.25;
 * 
 * // Connect nodes
 * source.connect(highpass);
 * highpass.connect(compressor);
 * compressor.connect(audioContext.destination);
 * ```
 */
