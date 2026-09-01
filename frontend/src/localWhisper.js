/*
 * Farmora local speech-to-text
 *
 * Uses Whisper through Transformers.js in the browser. Speech audio is never
 * sent to a speech-recognition API. The Whisper model is downloaded once and
 * then kept in the browser cache for later use.
 */

const DEFAULT_MODEL = import.meta.env.VITE_WHISPER_MODEL || "Xenova/whisper-tiny";

let pipelinePromise = null;
let transformersPromise = null;

export function getWhisperModelName() {
  return DEFAULT_MODEL;
}

async function getTransformers() {
  if (!transformersPromise) {
    // Keep the frontend dependency-free for Vercel builds. The Transformers.js
    // browser bundle is loaded only when voice transcription is actually used.
    // Using a runtime import prevents Vite from trying to resolve a package
    // that is not needed during the normal application build.
    const url = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";
    transformersPromise = new Function("url", "return import(url);")(url);
  }
  return transformersPromise;
}

async function getTranscriber(onProgress) {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await getTransformers();

      // Models are fetched from Hugging Face on first use, then cached by the
      // browser. We intentionally do not require a Hugging Face API token.
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      env.useBrowserCache = true;

      return pipeline("automatic-speech-recognition", DEFAULT_MODEL, {
        device: "wasm",
        dtype: "q8",
        progress_callback: onProgress,
      });
    })().catch((error) => {
      pipelinePromise = null;
      throw error;
    });
  }
  return pipelinePromise;
}

function resampleTo16k(input, inputSampleRate) {
  if (inputSampleRate === 16000) return input;

  const ratio = inputSampleRate / 16000;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const weight = position - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }

  return output;
}

async function decodeToMono16k(blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("AudioContext is not supported");

  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const length = buffer.length;
    const mono = new Float32Array(length);

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) mono[i] += data[i] / buffer.numberOfChannels;
    }

    return resampleTo16k(mono, buffer.sampleRate);
  } finally {
    await context.close().catch(() => {});
  }
}

export async function transcribeAudioBlob(blob, { language = "english", warmupOnly = false, onProgress } = {}) {
  const transcriber = await getTranscriber(onProgress);
  if (warmupOnly) return "";
  if (!blob || !blob.size) throw new Error("No recorded audio");

  const audio = await decodeToMono16k(blob);
  if (!audio.length) return "";

  const result = await transcriber(audio, {
    language,
    task: "transcribe",
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });

  return typeof result === "string" ? result.trim() : (result?.text || "").trim();
}
