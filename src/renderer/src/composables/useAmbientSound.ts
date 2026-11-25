import { onUnmounted, ref } from 'vue'

export type AmbientKind = 'off' | 'rain' | 'stream' | 'white'

export const AMBIENT_KINDS: AmbientKind[] = ['off', 'rain', 'stream', 'white']

export const AMBIENT_LABELS: Record<AmbientKind, string> = {
    off: '静音',
    rain: '雨声',
    stream: '溪流',
    white: '白噪'
}

export function useAmbientSound() {
    const kind = ref<AmbientKind>('off')
    const volume = ref(0.35)

    let audio: AudioContext | null = null
    let source: AudioBufferSourceNode | null = null
    let filter: BiquadFilterNode | null = null
    let gain: GainNode | null = null
    let lfo: OscillatorNode | null = null
    let lfoGain: GainNode | null = null

    function ensureContext(): AudioContext {
        if (!audio) audio = new AudioContext()
        return audio
    }

    function makeNoise(context: AudioContext): AudioBuffer {
        const length = context.sampleRate * 2
        const buffer = context.createBuffer(1, length, context.sampleRate)
        const data = buffer.getChannelData(0)
        let last = 0
        for (let index = 0; index < length; index += 1) {
            const white = Math.random() * 2 - 1
            last = (last + 0.02 * white) / 1.02
            data[index] = last * 3.5
        }
        return buffer
    }

    function stopSource(): void {
        if (source) {
            try {
                source.stop()
            } catch {
                /* 已停止时忽略 */
            }
            source.disconnect()
            source = null
        }
        if (lfo) {
            try {
                lfo.stop()
            } catch {
                /* 已停止时忽略 */
            }
            lfo.disconnect()
            lfo = null
        }
        if (lfoGain) {
            lfoGain.disconnect()
            lfoGain = null
        }
        if (filter) {
            filter.disconnect()
            filter = null
        }
        if (gain) {
            gain.disconnect()
            gain = null
        }
    }

    function start(next: Exclude<AmbientKind, 'off'>): void {
        const context = ensureContext()
        void context.resume()
        stopSource()

        source = context.createBufferSource()
        source.buffer = makeNoise(context)
        source.loop = true

        gain = context.createGain()
        gain.gain.value = volume.value

        filter = context.createBiquadFilter()
        if (next === 'rain') {
            filter.type = 'highpass'
            filter.frequency.value = 1200
        } else if (next === 'stream') {
            filter.type = 'bandpass'
            filter.frequency.value = 900
            filter.Q.value = 0.8
        } else {
            filter.type = 'lowpass'
            filter.frequency.value = 6000
        }

        source.connect(filter)
        filter.connect(gain)
        gain.connect(context.destination)
        source.start()

        if (next !== 'white') {
            lfo = context.createOscillator()
            lfo.frequency.value = next === 'rain' ? 0.18 : 0.32
            lfoGain = context.createGain()
            lfoGain.gain.value = next === 'rain' ? 0.12 : 0.2
            lfo.connect(lfoGain)
            lfoGain.connect(gain.gain)
            lfo.start()
        }
    }

    function setKind(next: AmbientKind): void {
        kind.value = next
        if (next === 'off') {
            stopSource()
            return
        }
        start(next)
    }

    function setVolume(value: number): void {
        volume.value = Math.min(1, Math.max(0, value))
        if (gain) gain.gain.value = volume.value
    }

    onUnmounted(() => {
        stopSource()
        if (audio) {
            void audio.close()
            audio = null
        }
    })

    return { kind, volume, setKind, setVolume }
}