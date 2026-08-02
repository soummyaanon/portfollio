'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

/**
 * Sound for the plate.
 *
 * Off by default and silent until asked, which is not only manners — a browser will refuse to
 * start audio without a gesture anyway, so the button is doing double duty as the permission
 * it needs. The file is not fetched until the first press either: 1.7 MB is a real cost and
 * nobody who never presses this should pay it.
 *
 * The track is trimmed to loop on itself, with a crossfade baked across the seam, so `loop`
 * on the element is all the looping this needs. Volume is ramped rather than switched at both
 * ends — music that arrives at full level reads as a mistake, and music that stops dead reads
 * as a crash.
 */
const SOURCE = '/audio/theme.m4a'
const LEVEL = 0.5
const RAMP_MS = 1600

type State = 'off' | 'loading' | 'on' | 'unavailable'

export function AudioToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const frameRef = useRef(0)
  // What the visitor last asked for, which is not the same as what is currently happening:
  // play() is a promise, and it can resolve after a second press has already asked for
  // silence. Without this the button and the sound get out of step.
  const wantsSound = useRef(false)
  const [state, setState] = useState<State>('off')

  const rampTo = useCallback((target: number, done?: () => void) => {
    const audio = audioRef.current
    if (!audio) return
    cancelAnimationFrame(frameRef.current)
    const from = audio.volume
    const started = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - started) / RAMP_MS)
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * t))
      if (t < 1) frameRef.current = requestAnimationFrame(step)
      else done?.()
    }
    frameRef.current = requestAnimationFrame(step)
  }, [])

  const toggle = useCallback(async () => {
    let audio = audioRef.current
    if (!audio) {
      audio = new Audio(SOURCE)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
      audioRef.current = audio
    }

    if (wantsSound.current) {
      wantsSound.current = false
      setState('off')
      rampTo(0, () => {
        // Only actually stop if nothing has asked for sound again in the meantime.
        if (!wantsSound.current) audio.pause()
      })
      return
    }

    wantsSound.current = true
    setState('loading')
    try {
      await audio.play()
      if (!wantsSound.current) {
        audio.pause()
        return
      }
      setState('on')
      rampTo(LEVEL)
    } catch {
      // Blocked, offline, or the file is not there. Say so rather than leaving a dead button.
      wantsSound.current = false
      setState('unavailable')
    }
  }, [rampTo])

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current)
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.src = ''
      }
    },
    [],
  )

  const playing = state === 'on'
  const busy = state === 'loading'
  const dead = state === 'unavailable'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={dead}
      aria-pressed={playing}
      // The icon is the whole control, so the button has to say in words what it does — this
      // is the only name a screen reader gets, and "sound" would not have said which way.
      aria-label={playing ? 'Stop the music' : 'Play music'}
      title={dead ? 'Audio unavailable' : playing ? 'Stop the music' : 'Play music'}
      className="pointer-events-auto absolute bottom-0 right-0 z-10 grid size-8 place-items-center rounded-full border border-border bg-background/85 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-40 disabled:hover:text-muted-foreground"
    >
      {/* A speaker with waves when it is playing, a crossed-out one when it is not — the two
          halves of one idea, so the state reads at a glance without a word beside it. While
          the file is still arriving the speaker dims and breathes rather than spinning: a
          spinner would be the only piece of chrome on the page that looks like an app. */}
      {playing ? (
        <Volume2 className="size-4" aria-hidden strokeWidth={1.5} />
      ) : (
        <VolumeX
          className={`size-4 ${busy ? 'animate-pulse opacity-60' : ''}`}
          aria-hidden
          strokeWidth={1.5}
        />
      )}
    </button>
  )
}
