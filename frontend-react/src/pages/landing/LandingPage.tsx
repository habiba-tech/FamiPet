import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { Icon } from '../../components/shared/Icon'

// Landing sections ported from frontend/index.html sections 1:1 (hero, services,
// about, why-us, join-us/CTA). The services and why-us grids statically render
// the same data home.js injected into `#servicesGrid` / `#whyGrid`. Icons are the
// same `/assets/icons/*.svg` files; hero/about/cta art from `/assets/images/hero/`.

const services = [
  {
    title: 'Pet Adoption',
    description: 'Find loving pets waiting for a forever home.',
    icon: '/assets/icons/pet-adoption.svg',
  },
  {
    title: 'Health Records',
    description: "Store and manage your pet's medical history.",
    icon: '/assets/icons/health.svg',
  },
  {
    title: 'AI Pet Assistant',
    description: 'Ask PetGPT anything about your furry friend.',
    icon: '/assets/icons/ai.svg',
  },
  {
    title: 'Lost & Found',
    description: 'Help reunite lost pets with their families.',
    icon: '/assets/icons/lost-found.svg',
  },
  {
    title: 'Vaccination Tracker',
    description: 'Never miss another vaccination reminder.',
    icon: '/assets/icons/vaccination.svg',
  },
  {
    title: 'Community',
    description: 'Connect with thousands of pet lovers.',
    icon: '/assets/icons/community.svg',
  },
]

const whyChoose = [
  {
    title: 'All-in-One Platform',
    description: 'Adoption, healthcare, AI assistance and reminders in one place.',
    icon: '/assets/icons/allheart.svg',
    color: '#FFEAF2',
    border: '#FF6B9A',
  },
  {
    title: 'Pet Lovers Community',
    description: 'Connect with pet owners, share experiences, and get helpful advice together.',
    icon: '/assets/icons/community.svg',
    color: '#EAF6FF',
    border: '#4AA8FF',
  },
  {
    title: 'AI PetGPT',
    description: 'Get instant answers and smart guidance for your pets.',
    icon: '/assets/icons/robot.svg',
    color: '#F2ECFF',
    border: '#9B6DFF',
  },
  {
    title: 'Secure Health Records',
    description: 'Keep vaccination and medical records safe and organized.',
    icon: '/assets/icons/shield.svg',
    color: '#EAFBF2',
    border: '#38C976',
  },
]

export function LandingPage() {
  return (
    <main className="landing">
      <section className="hero" id="home">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-tag">🐾 Welcome to Famipet</span>

            <h1>
              Better Care,
              <br />
              Better <span>Life</span>
              <br />
              For Your <span>Pets</span>
            </h1>

            <p>
              Manage your pets, track vaccinations, adopt loving companions, report lost &amp; found
              pets, and get AI-powered pet care guidance—all in one smart platform.
            </p>

            <div className="hero-buttons">
              <Link to="/login" className="primary-btn">
                Get Started
                <Icon name="paw" />
              </Link>

              <a href="#about" className="secondary-btn">
                Learn More
                <Icon name="arrow-right" />
              </a>
            </div>
          </div>

          <div className="hero-image">
            <img src="/assets/images/hero/hero-pets.png" alt="Pets" />
          </div>
        </div>
      </section>

      <section className="services" id="services">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">🐾 Our Services</span>

            <h2>
              Everything Your Pet Needs,
              <span>All in One Place</span>
            </h2>

            <p>Discover smart services designed to keep your furry friends healthy, happy, and safe.</p>
          </div>

          <div className="services-grid">
            {services.map((service) => (
              <div className="service-card" key={service.title}>
                <div className="service-icon">
                  <img src={service.icon} alt={service.title} />
                </div>

                <div className="service-content">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <div className="container about-container">
          <div className="about-image">
            <img src="/assets/images/hero/about.png" alt="About Famipet" />
          </div>

          <div className="about-content">
            <div className="about-header">
              <span className="about-tag">🐾 About Famipet</span>

              <h2>
                Caring for Every Pet,
                <span>Every Step of the Way</span>
              </h2>
            </div>

            <p>
              <strong>Famipet</strong> is a smart pet care platform that helps pet owners manage pet
              health, explore breeds, adopt pets, and access AI-powered guidance in one place.
            </p>

            <p>
              Our mission is to make pet care simple, smart, and accessible while creating a safe and
              supportive space for every pet and owner.
            </p>
          </div>
        </div>
      </section>

      <section className="why-choose" id="why-us">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">🐾 Why Choose Famipet</span>

            <h2>
              Trusted by <span>Pet Lovers</span> Everywhere
            </h2>

            <p>Everything you need to care for your pets in one beautiful, smart, and secure platform.</p>
          </div>

          <div className="why-grid">
            {whyChoose.map((item) => (
              <div
                className="why-card"
                key={item.title}
                style={{ borderTop: `6px solid ${item.border}`, '--accent': item.border } as CSSProperties}
              >
                <div className="why-icon" style={{ background: item.color }}>
                  <img src={item.icon} alt={item.title} />
                </div>

                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta" id="join-us">
        <div className="container">
          <div className="cta-box">
            <div className="paw paw1">🐾</div>
            <div className="paw paw2">🐾</div>
            <div className="paw paw3">❤️</div>

            <div className="cta-content">
              <span className="section-tag">🐾 Join Famipet</span>

              <h2>
                Give Your Pet the <span>Best Care</span> They Deserve
              </h2>

              <p>
                Join Famipet today to manage pets, discover adoptable companions, report lost or found
                pets, and enjoy smart pet care tools.
              </p>

              <div className="cta-buttons">
                <Link to="/signup" className="btn-primary">
                  Get Started
                  <Icon name="paw" />
                </Link>

                <a href="#services" className="btn-secondary">
                  Explore Services
                  <Icon name="arrow-right" />
                </a>
              </div>
            </div>

            <div className="cta-image">
              <img src="/assets/images/hero/pets-footer.svg" alt="Happy Pets" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}