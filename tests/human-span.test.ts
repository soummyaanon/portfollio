import { describe, expect, it } from 'vitest'

import { DECIMALS, KALI_EPOCH_MS, humanShare, vedicYears } from '@/components/document/HumanSpan'

describe('Puranic reckoning', () => {
  it('starts Kali Yuga on 18 February 3102 BCE (Julian), which is 23 January -3101 proleptic Gregorian', () => {
    expect(new Date(KALI_EPOCH_MS).toISOString()).toBe('-003101-01-23T00:00:00.000Z')
  })

  it('has 120,528,000 years of Vaivasvata Manvantara and 155,521,972,944,000 of Brahma at Kali epoch', () => {
    expect(vedicYears(KALI_EPOCH_MS)).toEqual({
      human: BigInt(120_528_000),
      universe: BigInt('155521972944000'),
    })
  })

  it('counts 5,127 years of Kali Yuga by late 2026', () => {
    const { human } = vedicYears(Date.UTC(2026, 10, 12))
    expect(human - BigInt(120_528_000)).toBe(BigInt(5_127))
  })
})

describe('humanShare', () => {
  it('is 120,528,000 of 155,521,972,944,000 years at Kali epoch', () => {
    expect(Number(humanShare(KALI_EPOCH_MS))).toBeCloseTo((120_528_000 / 155_521_972_944_000) * 100, 18)
  })

  it('always has the full number of decimals', () => {
    expect(humanShare(Date.now()).split('.')[1]).toHaveLength(DECIMALS)
  })

  it('moves in the last decimal within a tenth of a second, and only upward', () => {
    const now = Date.UTC(2026, 10, 12)
    const before = BigInt(humanShare(now).replace('.', ''))
    const after = BigInt(humanShare(now + 100).replace('.', ''))
    expect(after).toBeGreaterThan(before)
  })
})
