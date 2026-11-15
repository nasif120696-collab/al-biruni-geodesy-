import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function KineticHeading({ text, className = '', as = 'h2' }) {
  const containerRef = useRef(null)
  const Tag = as

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.word-token',
        { opacity: 0, y: 22, filter: 'blur(6px)' },
        {
          opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.75, stagger: 0.055, ease: 'power3.out',
          scrollTrigger: { trigger: containerRef.current, start: 'top 88%', once: true },
        }
      )
    }, containerRef)
    return () => ctx.revert()
  }, [text])

  const words = text.split(' ')

  return (
    <Tag ref={containerRef} className={className}>
      {words.map((w, i) => (<span key={i} className="word-token mr-[0.28em]">{w}</span>))}
    </Tag>
  )
}