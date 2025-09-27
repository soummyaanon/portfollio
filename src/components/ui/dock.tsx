"use client"

import React, { PropsWithChildren, useRef } from "react"
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

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string
  iconSize?: number
  iconMagnification?: number
  disableMagnification?: boolean
  iconDistance?: number
  direction?: "top" | "middle" | "bottom"
  children: React.ReactNode
}

const DEFAULT_SIZE = 40
const DEFAULT_MAGNIFICATION = 60
const DEFAULT_DISTANCE = 140
const DEFAULT_DISABLEMAGNIFICATION = false

const dockVariants = cva(
  "supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 mx-auto mt-8 flex h-[58px] w-max items-center justify-center gap-2 rounded-2xl border p-2 backdrop-blur-md"
)

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      iconMagnification = DEFAULT_MAGNIFICATION,
      disableMagnification = DEFAULT_DISABLEMAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = "middle",
      ...props
    },
    ref
  ) => {
    const mouseX = useMotionValue(Infinity)

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
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {renderChildren()}
      </motion.div>
    )
  }
)

Dock.displayName = "Dock"

export interface DockIconProps
  extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, "children"> {
  size?: number
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
  const padding = Math.max(6, size * 0.2)
  const defaultMouseX = useMotionValue(Infinity)

  const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const targetSize = disableMagnification ? size : magnification

  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, targetSize, size]
  )

  const scaleSize = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  })

  const iconElement = (
    <motion.div
      ref={ref}
      style={{ width: scaleSize, height: scaleSize, padding }}
      className={cn(
        "flex aspect-square cursor-pointer items-center justify-center rounded-full",
        disableMagnification && "hover:bg-muted-foreground transition-colors",
        className
      )}
    >
      <div {...props}>{children}</div>
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

const DockSeparator = ({ className }: DockSeparatorProps) => {
  return (
    <Separator
      orientation="vertical"
      className={cn("h-8 w-px bg-border", className)}
    />
  )
}

DockSeparator.displayName = "DockSeparator"

const NavigationDock = () => {
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
    window.location.href = 'mailto:your.email@example.com'
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Dock direction="middle">
        <DockIcon tooltip="Home" onClick={scrollToTop}>
          <Icons.home className="size-6" />
        </DockIcon>
        <DockIcon tooltip="Blogs" onClick={navigateToBlogs}>
          <Icons.blogs className="size-6" />
        </DockIcon>
        <DockSeparator />
        <DockIcon tooltip="GitHub" onClick={navigateToGitHub}>
          <Icons.gitHub className="size-6" />
        </DockIcon>
        <DockIcon tooltip="LinkedIn" onClick={navigateToLinkedIn}>
          <Icons.linkedin className="size-6" />
        </DockIcon>
        <DockIcon tooltip="X" onClick={navigateToTwitter}>
          <Icons.x className="size-6" />
        </DockIcon>
        <DockIcon tooltip="Email" onClick={navigateToEmail}>
          <Icons.email className="size-6" />
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
