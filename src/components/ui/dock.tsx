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
import { Home, FileText, Github, Linkedin, Mail } from "lucide-react"
import { FaXTwitter } from "react-icons/fa6"
import { AnimatedThemeToggler } from "./animated-theme-toggler"

import { cn } from "@/lib/utils"
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

  const iconElement = (
    <motion.div
      ref={ref}
      {...props}
      style={{ width: scaleSize, height: scaleSize, padding: paddingValue }}
      className={cn(
        "flex aspect-square cursor-pointer items-center justify-center rounded-full",
        disableMagnification && "hover:bg-muted-foreground transition-colors",
        className
      )}
    >
      <motion.div
        style={{ scale: iconScale }}
        className="flex h-full w-full items-center justify-center"
      >
        {sizedChildren}
      </motion.div>
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

const NavigationDock = () => {
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

  const scrollToTop = () => {
    window.location.href = '/'
  }

  const navigateToBlogs = () => {
    window.location.href = '/blogs'
  }

  const navigateToGitHub = () => {
    window.open('https://github.com/soummyaanon', '_blank')
  }

  const navigateToLinkedIn = () => {
    window.open('https://www.linkedin.com/in/soumyapanda12/', '_blank')
  }

  const navigateToTwitter = () => {
    window.open('https://x.com/SoumyapX', '_blank')
  }

  const navigateToEmail = () => {
    window.location.href = 'mailto:your.soumyaranjanpanda910@gmail.com'
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Dock
        direction="middle"
        iconSize={DEFAULT_SIZE}
        baseIconSize={dockSizeSpring}
      >
        <DockIcon tooltip="Home" onClick={scrollToTop}>
          <Icons.home className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip="Blogs" onClick={navigateToBlogs}>
          <Icons.blogs className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockSeparator
          currentSize={dockSize}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
        />
        <DockIcon tooltip="GitHub" onClick={navigateToGitHub}>
          <Icons.gitHub className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip="LinkedIn" onClick={navigateToLinkedIn}>
          <Icons.linkedin className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip="X" onClick={navigateToTwitter}>
          <Icons.x className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockIcon tooltip="Email" onClick={navigateToEmail}>
          <Icons.email className="size-6" strokeWidth={1} />
        </DockIcon>
        <DockSeparator
          currentSize={dockSize}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
        />
        <DockIcon tooltip="Toggle theme">
          <div className="flex items-center justify-center w-full h-full">
            <AnimatedThemeToggler className="size-6" />
          </div>
        </DockIcon>
      </Dock>
    </div>
  )
}

NavigationDock.displayName = "NavigationDock"

const Icons = {
  home: Home,
  blogs: FileText,
  gitHub: Github,
  linkedin: Linkedin,
  x: FaXTwitter,
  email: Mail,
}

export { Dock, DockIcon, DockSeparator, NavigationDock, dockVariants }
