import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function ScrollManager() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.9 })
    let rafId
    const tick = (time) => { lenis.raf(time); rafId = requestAnimationFrame(tick) }
    rafId = requestAnimationFrame(tick)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.lagSmoothing(0)
    return () => { cancelAnimationFrame(rafId); lenis.destroy() }
  }, [])
  return null
}