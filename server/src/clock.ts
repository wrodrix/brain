export interface Clock {
  now(): Date
}

export const systemClock: Clock = {
  now: () => new Date(),
}

/**
 * Relógio de teste com deslocamento explícito. Nunca é usado para alterar o
 * relógio do host; serve para provar prazos longos em milissegundos.
 */
export class ShiftedClock implements Clock {
  private offsetMs = 0

  constructor(private readonly base: Clock = systemClock) {}

  now(): Date {
    return new Date(this.base.now().getTime() + this.offsetMs)
  }

  advance(ms: number): void {
    if (!Number.isFinite(ms)) throw new Error("Deslocamento inválido")
    this.offsetMs += ms
  }

  reset(): void {
    this.offsetMs = 0
  }
}
