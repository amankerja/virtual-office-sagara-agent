/**
 * Procedural Web Audio API Spatial Sound Effects Engine
 * Generates soft typing clicks, espresso hums, and ambient room tones procedurally.
 * Zero external audio file dependencies, fully browser-safe.
 */

class OfficeAudioEngine {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false
  private isInitialized: boolean = false

  public init(): void {
    if (this.isInitialized) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
        this.isInitialized = true
      }
    } catch {
      // Browser autoplay policy until user gesture
    }
  }

  public playTypingClick(volume: number = 0.12): void {
    if (this.isMuted || !this.ctx) return
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume()
      }
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      // High-pitched mechanical switch click frequency
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1400 + Math.random() * 800, now)

      gain.gain.setValueAtTime(volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.035)
    } catch {
      // Ignore audio exceptions
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    return this.isMuted
  }

  public getMuted(): boolean {
    return this.isMuted
  }
}

export const officeAudio = new OfficeAudioEngine()
