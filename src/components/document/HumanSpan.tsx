'use client'

import { useEffect, useState } from 'react'

/**
 * Puranic time, as reckoned in the Surya Siddhanta and the Vishnu and Bhagavata Puranas.
 *
 *   Mahayuga    = Satya 1,728,000 + Treta 1,296,000 + Dvapara 864,000 + Kali 432,000 years
 *   Manvantara  = 71 Mahayugas, each followed by a 1,728,000-year sandhi
 *   Kalpa       = 14 Manvantaras + 15 sandhis = 1,000 Mahayugas = 4.32 billion years
 *   Brahma year = 360 days and 360 nights of Brahma, each a Kalpa long
 *
 * Brahma has completed 50 years. In the first day of his 51st (Shveta Varaha Kalpa), we are
 * in the 7th Manvantara (Vaivasvata), 28th Mahayuga, Kali Yuga. Both spans below are their
 * lengths at the moment Kali Yuga began, and both grow by the same time from then on.
 */
const MAHAYUGA = 4_320_000
const SANDHI = 1_728_000
const MANVANTARA = 71 * MAHAYUGA
const KALPA = 1_000 * MAHAYUGA
const BRAHMA_YEAR = 360 * 2 * KALPA

/** Years since Vaivasvata Manu, progenitor of present humanity: 27 Mahayugas, then the
 *  Satya, Treta and Dvapara of the 28th. 120,528,000. */
const HUMAN_AT_KALI = BigInt(27 * MAHAYUGA + 3_888_000)

/** Brahma's age: 50 years, then the opening sandhi and 6 Manvantaras (each with its
 *  sandhi) of today, and the same 120,528,000 years of this Manvantara. 155,521,972,944,000. */
const UNIVERSE_AT_KALI =
  BigInt(50) * BigInt(BRAHMA_YEAR) + BigInt(SANDHI + 6 * (MANVANTARA + SANDHI)) + HUMAN_AT_KALI

/**
 * The Surya Siddhanta's sidereal year: 1,577,917,828 civil days in 4,320,000 years, which
 * comes to exactly 31,558,356,560 ms. Every year in the reckoning is this long.
 */
const YEAR_MS = BigInt(31_558_356_560)

/** Kali Yuga began at midnight, 18 February 3102 BCE (Julian): JD 588465.5. */
export const KALI_EPOCH_MS = (588_465.5 - 2_440_587.5) * 86_400_000

/**
 * The share rises by about 2e-20 percentage points a second, so it takes 21 decimals for the
 * last digit to move on every tick. Far past what a double holds, hence BigInt throughout.
 */
export const DECIMALS = 21
const TICK_MS = 100

function ages(nowMs: number) {
  const elapsed = BigInt(Math.floor(nowMs - KALI_EPOCH_MS))
  return {
    human: HUMAN_AT_KALI * YEAR_MS + elapsed,
    universe: UNIVERSE_AT_KALI * YEAR_MS + elapsed,
  }
}

/** Whole years since Vaivasvata Manu, and of Brahma's life, at `nowMs`. */
export function vedicYears(nowMs: number): { readonly human: bigint; readonly universe: bigint } {
  const { human, universe } = ages(nowMs)
  return { human: human / YEAR_MS, universe: universe / YEAR_MS }
}

/**
 * The share of Brahma's life that present humanity has existed for, as a percentage string
 * with `decimals` places, truncated rather than rounded so the digits only ever count up.
 */
export function humanShare(nowMs: number, decimals: number = DECIMALS): string {
  const { human, universe } = ages(nowMs)
  const scaled = (human * BigInt(100) * BigInt(10) ** BigInt(decimals)) / universe
  const digits = scaled.toString().padStart(decimals + 1, '0')
  return `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`
}

/**
 * The byline's one live number. Unlabelled on purpose; what it measures is only in the hover
 * title.
 *
 * The page is statically exported, so the server cannot know the moment a visitor arrives:
 * it renders dashes of the same width, and the first tick fills in the number. The face is
 * monospaced with tabular figures, so nothing shifts as digits change. No `aria-live`: a
 * number that changes ten times a second would never stop being announced.
 */
export function HumanSpan({
  describe,
}: {
  readonly describe: (percent: string, human: bigint, universe: bigint) => string
}) {
  const [nowMs, setNowMs] = useState<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  if (nowMs === null) {
    return <span className="whitespace-nowrap text-foreground/80">{`-.${'-'.repeat(DECIMALS)}%`}</span>
  }

  const years = vedicYears(nowMs)
  return (
    <span
      className="whitespace-nowrap text-foreground/80"
      title={describe(`${humanShare(nowMs, 8)}%`, years.human, years.universe)}
    >
      {humanShare(nowMs)}%
    </span>
  )
}
