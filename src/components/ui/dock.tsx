"use client"

import React, { PropsWithChildren, useRef, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"
import type { MotionProps } from "motion/react"
import { Home, FileText, FolderOpen, Github, Linkedin, Mail } from "lucide-react"
import { FaXTwitter } from "react-icons/fa6"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { counterpartPath, LOCALE_COOKIE, localizePath, type Locale } from "@/i18n/config"
import { shouldNudge } from "@/i18n/nudge"
import { useI18n } from "@/i18n/useLocale"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string
  iconSize?: number | MotionValue<number>
  baseIconSize?: number | MotionValue<number>
  iconMagnification?: number
  disableMagnification?: boolean
  iconDistance?: number
  direction?: "top" | "middle" | "bottom"
  dockHeight?: number | MotionValue<number>
  children: React.ReactNode
}

const DEFAULT_SIZE = 32
const DEFAULT_MAGNIFICATION = 50
const DEFAULT_DISTANCE = 100
const DEFAULT_DISABLEMAGNIFICATION = false
const MIN_ICON_SIZE = 30
const MAX_ICON_SIZE = 60

const clampIconSize = (value: number) =>
  Math.max(MIN_ICON_SIZE, Math.min(MAX_ICON_SIZE, value))

const isMotionValueNumber = (
  value: unknown
): value is MotionValue<number> => {
  return (
    typeof value === "object" &&
    value !== null &&
    "on" in value &&
    typeof (value as MotionValue<number>).on === "function" &&
    typeof (value as MotionValue<number>).get === "function"
  )
}

const dockVariants = cva(
  "supports-backdrop-blur:bg-neutral-300/20 supports-backdrop-blur:dark:bg-neutral-300/10 mx-auto mt-8 flex h-[48px] w-max items-center justify-center gap-3 rounded-2xl border border-black/30 dark:border-white/30 p-2 backdrop-blur-lg"
)

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      baseIconSize,
      iconMagnification = DEFAULT_MAGNIFICATION,
      disableMagnification = DEFAULT_DISABLEMAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = "middle",
      dockHeight,
      ...props
    },
    ref
  ) => {
    const mouseX = useMotionValue(Infinity)
    const resolvedBaseSize = (() => {
      if (typeof baseIconSize === "number") {
        return baseIconSize
      }
      if (isMotionValueNumber(baseIconSize)) {
        return baseIconSize.get()
      }
      if (typeof iconSize === "number") {
        return iconSize
      }
      if (isMotionValueNumber(iconSize)) {
        return iconSize.get()
      }
      return DEFAULT_SIZE
    })()

    const initialBaseSize = clampIconSize(resolvedBaseSize)

    const iconBaseSize = useMotionValue(initialBaseSize)

    // Create reactive height MotionValue
    const heightMotionValue = useMotionValue(dockHeight ?
      (typeof dockHeight === 'number' ? dockHeight : dockHeight.get()) : 48)

    // Update height when dockHeight changes
    React.useEffect(() => {
      if (dockHeight) {
        if (typeof dockHeight === 'number') {
          heightMotionValue.set(dockHeight)
        } else {
          const updateHeight = (value: number) => {
            heightMotionValue.set(value)
          }
          updateHeight(dockHeight.get())
          const unsubscribe = dockHeight.on('change', updateHeight)
          return unsubscribe
        }
      } else {
        heightMotionValue.set(48) // default height
      }
    }, [dockHeight, heightMotionValue])

    React.useEffect(() => {
      if (typeof baseIconSize === "number") {
        iconBaseSize.set(clampIconSize(baseIconSize))
        return
      }

      if (isMotionValueNumber(baseIconSize)) {
        const update = (value: number) => {
          iconBaseSize.set(clampIconSize(value))
        }

        update(baseIconSize.get())
        const unsubscribe = baseIconSize.on("change", update)
        return () => unsubscribe()
      }

      if (typeof iconSize === "number") {
        iconBaseSize.set(clampIconSize(iconSize))
        return
      }

      if (isMotionValueNumber(iconSize)) {
        const update = (value: number) => {
          iconBaseSize.set(clampIconSize(value))
        }

        update(iconSize.get())
        const unsubscribe = iconSize.on("change", update)
        return () => unsubscribe()
      }

      iconBaseSize.set(DEFAULT_SIZE)
    }, [baseIconSize, iconSize, iconBaseSize])

    const dockScale = useTransform(iconBaseSize, (size) => size / DEFAULT_SIZE)

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (
          React.isValidElement<DockIconProps>(child) &&
          child.type === DockIcon
        ) {
          return React.cloneElement(child, {
            ...child.props,
            mouseX: mouseX,
            size: iconSize,
            magnification: iconMagnification,
            disableMagnification: disableMagnification,
            distance: iconDistance,
          })
        }
        return child
      })
    }

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        style={{
          height: heightMotionValue,
          scale: dockScale,
          originX: 0.5,
          originY: 1,
        }}
        className={cn(
          dockVariants(),
          dockHeight ? "" : "h-[48px]", // Only use fixed height if no dockHeight provided
          {
            "items-start": direction === "top",
            "items-center": direction === "middle",
            "items-end": direction === "bottom",
          },
          className
        )}
      >
        {renderChildren()}
      </motion.div>
    )
  }
)

Dock.displayName = "Dock"

export interface DockIconProps
  extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, "children"> {
  size?: number | MotionValue<number>
  magnification?: number
  disableMagnification?: boolean
  distance?: number
  mouseX?: MotionValue<number>
  className?: string
  children?: React.ReactNode
  props?: PropsWithChildren
  tooltip?: string
  /** Renders a real link instead of a button. Crawlers follow `href`, never `onClick`. */
  href?: string
  /** Opens in a new tab, and marks the link `rel="me"` as one of the author's profiles. */
  external?: boolean
}

export interface DockSeparatorProps {
  className?: string
  onResizeStart?: (currentSize: number) => void
  onResize?: (newSize: number) => void
  onResizeEnd?: () => void
  currentSize?: number
}

const DockIcon = ({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  disableMagnification,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  tooltip,
  href,
  external,
  ...props
}: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const defaultMouseX = useMotionValue(Infinity)
  const sizeMotionValue = useMotionValue(
    typeof size === "number"
      ? size
      : size?.get?.() ?? DEFAULT_SIZE
  )

  React.useEffect(() => {
    if (typeof size === "number") {
      sizeMotionValue.set(size)
      return
    }

    if (!size) {
      sizeMotionValue.set(DEFAULT_SIZE)
      return
    }

    const updateSize = (value: number) => {
      sizeMotionValue.set(value)
    }

    updateSize(size.get())
    const unsubscribe = size.on("change", updateSize)

    return () => {
      unsubscribe()
    }
  }, [size, sizeMotionValue])

  const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const baseSize = sizeMotionValue

  // Create a combined transform that responds to both mouse position and base size changes
  const combinedSize = useMotionValue(0)

  React.useEffect(() => {
    const updateSize = () => {
      const dist = distanceCalc.get()
      const currentBaseSize = baseSize.get()
      const target = disableMagnification ? currentBaseSize : magnification
      const progress = Math.abs(dist) / distance
      const clampedProgress = Math.max(0, Math.min(1, progress))
      const newSize = currentBaseSize + (target - currentBaseSize) * (1 - clampedProgress)
      combinedSize.set(newSize)
    }

    // Update immediately
    updateSize()

    // Subscribe to changes
    const unsubscribe1 = distanceCalc.on('change', updateSize)
    const unsubscribe2 = baseSize.on('change', updateSize)

    return () => {
      unsubscribe1()
      unsubscribe2()
    }
  }, [distanceCalc, baseSize, magnification, distance, disableMagnification, combinedSize])

  const scaleSize = useSpring(combinedSize, {
    mass: 0.15,
    stiffness: 200,
    damping: 18,
  })

  const paddingValue = useTransform(sizeMotionValue, (s) => Math.max(6, s * 0.2))
  const iconScale = useTransform(scaleSize, (s) => s / DEFAULT_SIZE)

  const sizedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child
    }

    const childProps = child.props as Record<string, unknown>
    const childClassName = childProps.className as string | undefined
    const childStyle = childProps.style as React.CSSProperties | undefined

    // Create restProps by omitting className and style
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { className, style, ...restProps } = childProps

    return React.cloneElement(child, {
      ...restProps,
      className: cn("h-full w-full", childClassName),
      style: {
        ...(childStyle ?? {}),
        width: "100%",
        height: "100%",
      },
    } as React.HTMLAttributes<HTMLElement> & Record<string, unknown>)
  })

  /**
   * An icon that does something is a button, not a div with an onClick. As a div it is
   * unreachable by keyboard, has no role, and carries no name — so the whole dock was
   * invisible to assistive tech and to any agent reading the accessibility tree.
   *
   * The one icon that must stay a div is the theme toggle: it has no `onClick` of its own
   * because it wraps a real `<button>`, and a button inside a button is invalid markup that
   * browsers silently unnest. Keying off `onClick` picks the right element every time
   * without a second prop to keep in sync.
   */
  const isInteractive = typeof props.onClick === "function"

  const shellStyle = { width: scaleSize, height: scaleSize, padding: paddingValue }
  const shellClass = cn(
    "flex aspect-square cursor-pointer items-center justify-center rounded-full",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
    disableMagnification && "hover:bg-muted-foreground transition-colors",
    className
  )
  const inner = (
    <motion.div
      style={{ scale: iconScale }}
      className="flex h-full w-full items-center justify-center"
    >
      {sizedChildren}
    </motion.div>
  )

  // Separate branches rather than a computed tag, because the props are typed against a div
  // and a button's handlers are not the same type. Casting once here is cheaper than making
  // the whole prop surface generic over the element.
  //
  // Navigation is a link, not a button that sets window.location: the dock is the only
  // site-wide navigation, and as buttons it gave crawlers no path to /blogs/ or /projects/
  // at all — those pages were reachable only through the sitemap.
  const iconElement = href ? (
    <motion.a
      ref={ref as unknown as React.Ref<HTMLAnchorElement>}
      {...(props as unknown as React.ComponentProps<typeof motion.a>)}
      href={href}
      {...(external ? { target: "_blank", rel: "me noopener noreferrer" } : {})}
      aria-label={tooltip}
      style={shellStyle}
      className={shellClass}
    >
      {inner}
    </motion.a>
  ) : isInteractive ? (
    <motion.button
      ref={ref as unknown as React.Ref<HTMLButtonElement>}
      {...(props as unknown as React.ComponentProps<typeof motion.button>)}
      type="button"
      aria-label={tooltip}
      style={shellStyle}
      className={shellClass}
    >
      {inner}
    </motion.button>
  ) : (
    <motion.div ref={ref} {...props} style={shellStyle} className={shellClass}>
      {inner}
    </motion.div>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {iconElement}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return iconElement
}

DockIcon.displayName = "DockIcon"

const DockSeparator = ({
  className,
  onResizeStart,
  onResize,
  onResizeEnd,
  currentSize = DEFAULT_SIZE
}: DockSeparatorProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startSize, setStartSize] = useState(DEFAULT_SIZE)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartY(e.clientY)
    setStartSize(clampIconSize(currentSize))
    onResizeStart?.(currentSize)
    e.preventDefault()

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY
      const newSize = clampIconSize(startSize + deltaY * 1.2)
      onResize?.(newSize)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onResizeEnd?.()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const separatorHeight = 32

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Drag to resize dock"
      className={cn(
        "w-2 bg-border cursor-ns-resize hover:bg-primary/50 transition-all duration-200 rounded-sm flex items-center justify-center",
        isDragging && "bg-primary scale-110 shadow-lg",
        className
      )}
      style={{ height: separatorHeight }}
      onMouseDown={handleMouseDown}
      title="Drag to resize dock"
    >
      <div className="w-0.5 h-4 bg-current opacity-60"></div>
    </div>
  )
}

DockSeparator.displayName = "DockSeparator"

/**
 * Saves the visitor's choice before the switcher's link is followed. `vercel.json` reads it
 * on `/`, so a choice made once is honoured on every later visit and beats whatever language
 * the browser asks for.
 */
function rememberLocale(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; secure" : ""
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax${secure}`
}

/** Remembers that this tab has been nudged, so the pulse is once per visit, not per page. */
const NUDGE_KEY = "lang-nudged"

/**
 * True once, after mount, for a visitor in India reading English who has never chosen a
 * language (see `shouldNudge`). Decided in an effect, never during render: the time zone and
 * the cookie exist only in the browser, and reading them while rendering would make the
 * prerendered HTML disagree with the hydrated page.
 */
function useLanguageNudge(locale: Locale) {
  const [nudge, setNudge] = React.useState(false)

  React.useEffect(() => {
    let timeZone: string | undefined
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return
    }
    if (!shouldNudge({ locale, timeZone, cookie: document.cookie })) return

    // Storage can be blocked; the pulse then simply plays on each page, which is harmless.
    try {
      if (window.sessionStorage.getItem(NUDGE_KEY)) return
      window.sessionStorage.setItem(NUDGE_KEY, "1")
    } catch {}

    setNudge(true)
  }, [locale])

  return nudge
}

const NavigationDock = () => {
  const pathname = usePathname() ?? "/"
  const { locale, t } = useI18n()
  const nudge = useLanguageNudge(locale)
  const [dockSize, setDockSize] = useState(DEFAULT_SIZE)
  const dockSizeSpring = useSpring(dockSize, {
    mass: 0.12,
    stiffness: 220,
    damping: 24,
  })

  React.useEffect(() => {
    dockSizeSpring.set(dockSize)
  }, [dockSize, dockSizeSpring])

  const handleResizeStart = () => {
    // Could add visual feedback here
  }

  const handleResize = (newSize: number) => {
    setDockSize(clampIconSize(newSize))
  }

  const handleResizeEnd = () => {
    // Could add cleanup here
  }

  const navigateToEmail = () => {
    const email = 'soumyaranjanpanda910@gmail.com'
    const subject = encodeURIComponent('Project Inquiry')
    const body = encodeURIComponent('Hi Soumya,\n\nI came across your portfolio and would like to discuss...')
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Dock
        direction="middle"
        iconSize={DEFAULT_SIZE}
        baseIconSize={dockSizeSpring}
      >
        <DockIcon tooltip={t.nav.home} href={localizePath("/", locale)}>
          <Icons.home className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip={t.nav.blogs} href={localizePath("/blogs/", locale)}>
          <Icons.blogs className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip={t.nav.projects} href={localizePath("/projects/", locale)}>
          <Icons.projects className="size-6" strokeWidth={1} />
        </DockIcon>
        {/* The language switch: a real link to the same page in the other language, labelled
            in that language, so it reads to the person it is for. */}
        <DockIcon
          tooltip={t.switcher.label}
          href={counterpartPath(pathname, t.switcher.target)}
          onClick={() => rememberLocale(t.switcher.target)}
        >
          <span
            lang={t.switcher.target}
            className={cn(
              "flex items-center justify-center text-[0.8rem] font-medium leading-none",
              nudge && "lang-nudge"
            )}
          >
            {t.switcher.glyph}
          </span>
        </DockIcon>
        <DockSeparator
          currentSize={dockSize}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
        />
        <DockIcon tooltip="GitHub" href="https://github.com/soummyaanon" external>
          <Icons.gitHub className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip="LinkedIn" href="https://www.linkedin.com/in/soumyapanda12/" external>
          <Icons.linkedin className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip="X" href="https://x.com/SoumyapX" external>
          <Icons.x className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip={t.nav.email} onClick={navigateToEmail}>
          <Icons.email className="size-6" strokeWidth={1} />
        </DockIcon>
      </Dock>
    </div>
  )
}

NavigationDock.displayName = "NavigationDock"

const Icons = {
  home: Home,
  blogs: FileText,
  projects: FolderOpen,
  gitHub: Github,
  linkedin: Linkedin,
  x: FaXTwitter,
  email: Mail,
}

export { Dock, DockIcon, DockSeparator, NavigationDock, dockVariants }
