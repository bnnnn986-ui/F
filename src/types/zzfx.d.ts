declare module 'zzfx' {
  /** Plays a ZzFX sound; accepts up to 20 positional synth parameters. */
  export function zzfx(...parameters: number[]): AudioBufferSourceNode | undefined;
}
