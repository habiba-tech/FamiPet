// Parity with the Vanilla landing footer (frontend/index.html + footer.css).
// Newsletter form renders the original markup; Vanilla wires no submit handler.
// Social brand glyphs are inline SVGs (lucide has no brand icons; the FA CDN
// was removed in Phase 09 polish).

import { Icon } from './Icon'

const SOCIAL_PATHS: Record<string, string> = {
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  facebook:
    'M22.676 0H1.324C.593 0 0 .593 0 1.324v21.352C0 23.408.593 24 1.324 24h11.494v-9.294H9.689v-3.621h3.129V8.41c0-3.099 1.894-4.785 4.659-4.785 1.325 0 2.464.097 2.796.141v3.24h-1.921c-1.5 0-1.797.722-1.797 1.771v2.311h3.584l-.471 3.621h-3.113V24h6.114c.733 0 1.324-.592 1.324-1.324V1.324C24 .592 23.408 0 22.676 0',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
}

function BrandIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={name}>
      <path fill="currentColor" d={SOCIAL_PATHS[name]} />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="#" className="footer-logo">
              <img src="/assets/logos/Famipet.png" alt="Famipet Logo" />
            </a>

            <p>
              Caring for pets, connecting communities, and making adoption
              easier—one paw at a time.
            </p>
          </div>

          <div className="newsletter">
            <h3>Stay Updated with Famipet</h3>

            <p>
              Receive pet care tips, adoption updates, lost &amp; found alerts,
              and vaccination reminders.
            </p>

            <form id="newsletterForm">
              <input
                type="email"
                id="newsletterEmail"
                placeholder="Enter your email address"
                required
              />

              <button type="submit" className="btn-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>Quick Links</h4>
            <a href="#home">Home</a>
            <a href="#services">Services</a>
            <a href="#about">About</a>
            <a href="#why-us">Why Us</a>
            <a href="#join-us">Join Us</a>
          </div>

          <div className="footer-column">
            <h4>Services</h4>
            <a href="#">Pet Adoption</a>
            <a href="#">Lost &amp; Found</a>
            <a href="#">PetGPT</a>
            <a href="#">Vaccination Tracker</a>
          </div>

          <div className="footer-column">
            <h4>Resources</h4>
            <a href="#">Help Center</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms &amp; Conditions</a>
            <a href="#">Contact Us</a>
          </div>

          <div className="footer-column">
            <h4>Contact</h4>

            <p>
              <Icon name="location-dot" /> Mumbai, India
            </p>

            <p>
              <Icon name="phone" /> +91 XXXXX XXXXX
            </p>

            <p>
              <Icon name="envelope" /> hello@ann.com
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="social-links">
            <a href="#">
              <BrandIcon name="instagram" />
            </a>
            <a href="#">
              <BrandIcon name="facebook" />
            </a>
            <a href="#">
              <BrandIcon name="linkedin" />
            </a>
            <a href="#">
              <BrandIcon name="github" />
            </a>
          </div>

          <p className="copyright">© 2026 Famipet. All Rights Reserved.</p>

          <p className="footer-tagline">
            Made with <Icon name="heart" /> for Pet Lovers.
          </p>
        </div>
      </div>
    </footer>
  )
}