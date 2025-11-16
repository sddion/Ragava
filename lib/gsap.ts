// GSAP animation utilities for the music player
import { gsap } from 'gsap'

// GSAP animation configurations
export const GSAP_CONFIG = {
  // Default animation duration
  duration: 0.3,
  // Default easing
  ease: "power2.out",
  // Stagger delay for multiple elements
  stagger: 0.1,
}

// Initialize GSAP with default settings
export const initGSAP = () => {
  // Set default duration and ease
  gsap.defaults({
    duration: GSAP_CONFIG.duration,
    ease: GSAP_CONFIG.ease,
  })
}

// Fade in animation
export const fadeIn = (target: gsap.TweenTarget, options?: gsap.TweenVars) => {
  return gsap.fromTo(target, 
    { opacity: 0 }, 
    { 
      opacity: 1, 
      duration: 0.5,
      ease: "power2.out",
      ...options 
    }
  )
}

// Fade out animation
export const fadeOut = (target: gsap.TweenTarget, options?: gsap.TweenVars) => {
  return gsap.to(target, {
    opacity: 0,
    duration: 0.3,
    ease: "power2.in",
    ...options
  })
}

// Slide in from bottom animation
export const slideInFromBottom = (target: gsap.TweenTarget, options?: gsap.TweenVars) => {
  return gsap.fromTo(target,
    { 
      opacity: 0, 
      y: 20 
    },
    { 
      opacity: 1, 
      y: 0, 
      duration: 0.6,
      ease: "back.out(1.7)",
      ...options 
    }
  )
}

// Scale animation for buttons
export const scaleButton = (target: gsap.TweenTarget, scale: number = 1.1, options?: gsap.TweenVars) => {
  return gsap.to(target, {
    scale: scale,
    duration: 0.2,
    ease: "power2.out",
    yoyo: true,
    repeat: 1,
    ...options
  })
}

// Progress bar animation
export const animateProgress = (target: gsap.TweenTarget, width: string, options?: gsap.TweenVars) => {
  return gsap.to(target, {
    width: width,
    duration: 0.1,
    ease: "none",
    ...options
  })
}

// Heart animation for favorites
export const animateHeart = (target: gsap.TweenTarget, options?: gsap.TweenVars) => {
  return gsap.to(target, {
    scale: 1.3,
    duration: 0.3,
    ease: "back.out(1.7)",
    yoyo: true,
    repeat: 1,
    ...options
  })
}

// Stagger animation for multiple elements
export const staggerIn = (targets: gsap.TweenTarget, options?: gsap.TweenVars) => {
  return gsap.fromTo(targets,
    { 
      opacity: 0, 
      y: 20 
    },
    { 
      opacity: 1, 
      y: 0, 
      duration: 0.5,
      ease: "power2.out",
      stagger: GSAP_CONFIG.stagger,
      ...options 
    }
  )
}

// Timeline for complex animations
export const createTimeline = (options?: gsap.TimelineVars) => {
  return gsap.timeline(options)
}

export const isGSAPAvailable = (): boolean => {
  return typeof gsap !== 'undefined'
}

// Default export
export default gsap
