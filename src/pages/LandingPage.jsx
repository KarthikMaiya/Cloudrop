import './LandingPage.css'

import UploadCard from '../components/UploadCard'
import { useEffect, useRef, useState } from 'react'

function FeatureCard({ icon, title, description, index }) {
  return (
    <article
      className="featureCard"
      style={{ '--stagger': index }}
    >
      <div className="featureIcon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="featureTitle">{title}</h3>
      <p className="featureDescription">{description}</p>
    </article>
  )
}

export default function LandingPage(props) {
  const landingRef = useRef(null)
  const [animateIntro, setAnimateIntro] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('landingScrollSnap')
    return () => {
      root.classList.remove('landingScrollSnap')
    }
  }, [])

  useEffect(() => {
    // Delay animation trigger to ensure browser paints initial hidden state first.
    // This ensures animations work correctly on every page load and browser refresh.
    const timeoutId = setTimeout(() => {
      setAnimateIntro(true)
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [])

  // Observe generic reveals (headers/footer) but exclude the feature cards group
  useEffect(() => {
    const root = landingRef.current
    if (!root) return

    const targets = root.querySelectorAll('[data-reveal]:not([data-reveal="cards"])')
    if (!targets.length) return

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      for (const el of targets) el.classList.add('visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          } else {
            entry.target.classList.remove('visible')
          }
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' },
    )

    for (const el of targets) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Dedicated observer for features section to force-reset and replay animations
  const featuresRef = useRef(null)

  useEffect(() => {
    const el = featuresRef.current
    if (!el) return

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      // Make visible for reduced motion
      el.classList.add('visible')
      const sectionEl = el.closest('.featuresSection')
      if (sectionEl) sectionEl.classList.add('revealActive')
      return
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const grid = entry.target
          const sectionEl = grid.closest('.featuresSection')
          if (entry.isIntersecting) {
            // Remove then re-add classes to force a reflow and replay transitions
            grid.classList.remove('visible')
            if (sectionEl) sectionEl.classList.remove('revealActive')
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                grid.classList.add('visible')
                if (sectionEl) sectionEl.classList.add('revealActive')
              })
            })
          } else {
            grid.classList.remove('visible')
            if (sectionEl) sectionEl.classList.remove('revealActive')
          }
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' },
    )

    obs.observe(el)

    // immediate check on mount
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.remove('visible')
      const sectionEl = el.closest('.featuresSection')
      if (sectionEl) sectionEl.classList.remove('revealActive')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.add('visible')
          if (sectionEl) sectionEl.classList.add('revealActive')
        })
      })
    }

    return () => obs.disconnect()
  }, [])

  // Fallback scroll listener to ensure replay works on all browsers/environments
  useEffect(() => {
    const grid = featuresRef.current
    if (!grid) return

    let ticking = false
    const handler = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const rect = grid.getBoundingClientRect()
        const inView = rect.top < window.innerHeight && rect.bottom > 0
        const sectionEl = grid.closest('.featuresSection')
        if (inView) {
          grid.classList.remove('visible')
          if (sectionEl) sectionEl.classList.remove('revealActive')
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              grid.classList.add('visible')
              if (sectionEl) sectionEl.classList.add('revealActive')
            })
          })
        } else {
          grid.classList.remove('visible')
          if (sectionEl) sectionEl.classList.remove('revealActive')
        }
        ticking = false
      })
    }

    window.addEventListener('scroll', handler, { passive: true })
    // initial check
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div
      ref={landingRef}
      className={animateIntro ? 'landingRoot intro-loaded' : 'landingRoot'}
    >
      <section className="heroSection">
        <div className="container heroGrid">
          <div className="heroCopy">
            <div className="heroKicker">Temporary Cloud File Sharing</div>
            <h1 className="heroTitle">
              <span className="heroTitleGradient">Cloudrop</span>
            </h1>
            <p className="heroSubtitle">
              Upload files instantly, share secure temporary links, and let
              Cloudrop automatically delete expired files from the cloud.
            </p>

            <div className="heroStats" aria-label="Highlights">
              <div className="statPill">Presigned S3 uploads</div>
              <div className="statPill">Auto-expiring links</div>
              <div className="statPill">Real-time progress</div>
            </div>
          </div>

          <div className="heroCta" aria-label="Upload">
            <UploadCard {...props} layout="embedded" />
          </div>
        </div>
      </section>

      <section className="featuresSection" aria-label="Features">
        <div className="container">
          <header className="sectionHeader" data-reveal="section">
            <h2 className="sectionTitle">Built for fast, temporary sharing</h2>
            <p className="sectionSubtitle">
              A clean flow from upload → link → download, with automatic expiry.
            </p>
          </header>
          <div ref={featuresRef} className="featureGrid" data-reveal="cards">
            <FeatureCard
              index={0}
              title="Temporary sharing"
              description="Generate a link and share it instantly. Links expire automatically."
              icon={
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M10.6 13.4a1 1 0 0 1 1.4 0 3 3 0 0 0 4.2 0l2-2a3 3 0 0 0 0-4.2 3 3 0 0 0-4.2 0l-1 1a1 1 0 1 1-1.4-1.4l1-1a5 5 0 0 1 7 7l-2 2a5 5 0 0 1-7 0 1 1 0 0 1 0-1.4Z"
                    fill="currentColor"
                  />
                  <path
                    d="M13.4 10.6a1 1 0 0 1-1.4 0 3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 0 4.2 3 3 0 0 0 4.2 0l1-1A1 1 0 1 1 12.4 17l-1 1a5 5 0 0 1-7-7l2-2a5 5 0 0 1 7 0 1 1 0 0 1 0 1.4Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>
              }
            />

            <FeatureCard
              index={1}
              title="Auto-delete cleanup"
              description="Expired files are removed automatically so storage stays clean."
              icon={
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M9 3.75c0-.41.34-.75.75-.75h4.5c.41 0 .75.34.75.75V5h3a.75.75 0 0 1 0 1.5h-.62l-.88 13.05A2.5 2.5 0 0 1 14 22h-4a2.5 2.5 0 0 1-2.5-2.45L6.62 6.5H6a.75.75 0 0 1 0-1.5h3V3.75Zm2.25 0V5h1.5V3.75h-1.5ZM8.13 6.5l.86 12.93c.04.54.49.97 1.01.97h4c.53 0 .98-.43 1.01-.97l.86-12.93H8.13Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />

            <FeatureCard
              index={2}
              title="Secure cloud uploads"
              description="Uploads go directly to S3 via a backend-generated presigned URL."
              icon={
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M12 2.5c2.7 0 5 2.1 5 4.8V10h.75A2.25 2.25 0 0 1 20 12.25v6.5A2.25 2.25 0 0 1 17.75 21H6.25A2.25 2.25 0 0 1 4 18.75v-6.5A2.25 2.25 0 0 1 6.25 10H7V7.3c0-2.7 2.3-4.8 5-4.8Zm3.5 7.5V7.3C15.5 5.5 13.9 4 12 4S8.5 5.5 8.5 7.3V10h7Z"
                    fill="currentColor"
                    opacity="0.95"
                  />
                  <path
                    d="M12 13.25c.41 0 .75.34.75.75v2.25a.75.75 0 0 1-1.5 0V14c0-.41.34-.75.75-.75Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />

            <FeatureCard
              index={3}
              title="Lightning-fast transfers"
              description="See real-time progress while your upload streams to the cloud."
              icon={
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M13 2 4 14.2h7.1L11 22l9-12.2h-7.1L13 2Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      <footer className="footer" aria-label="Footer">
        <div className="container footerInner" data-reveal="footer">
          <div className="footerBrand">Cloudrop</div>
          <div className="footerMeta">Built with AWS serverless architecture</div>
        </div>
        <div className="footerSignature">
          <p className="signature">Built and designed by Karthik Maiya</p>
        </div>
      </footer>
    </div>
  )
}
