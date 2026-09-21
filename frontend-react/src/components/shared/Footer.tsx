// Parity with the Vanilla landing footer (frontend/index.html + footer.css).
// Newsletter form renders the original markup; Vanilla wires no submit handler.

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
              <i className="fa-solid fa-location-dot" /> Mumbai, India
            </p>

            <p>
              <i className="fa-solid fa-phone" /> +91 XXXXX XXXXX
            </p>

            <p>
              <i className="fa-solid fa-envelope" /> hello@ann.com
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="social-links">
            <a href="#">
              <i className="fab fa-instagram" />
            </a>
            <a href="#">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#">
              <i className="fab fa-linkedin-in" />
            </a>
            <a href="#">
              <i className="fab fa-github" />
            </a>
          </div>

          <p className="copyright">© 2026 Famipet. All Rights Reserved.</p>

          <p className="footer-tagline">
            Made with <i className="fa-solid fa-heart" /> for Pet Lovers.
          </p>
        </div>
      </div>
    </footer>
  )
}