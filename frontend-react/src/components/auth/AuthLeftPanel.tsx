// Left "welcome" panel of the two-column auth layout (login.css / signup.css).
// Brand + tagline + heading + copy + the floating login-pet illustration.

interface AuthLeftPanelProps {
  tagline: string
  title: string
  text: string
}

export function AuthLeftPanel({ tagline, title, text }: AuthLeftPanelProps) {
  return (
    <section className="login-left">
      <div className="brand">
        <div className="brand-logo">
          <img src="/assets/logos/Famipet.png" alt="Famipet Logo" />
        </div>
        <h1>Famipet</h1>
      </div>

      <div className="hero-text">
        <span className="tagline">{tagline}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      <div className="hero-image">
        <img src="/assets/images/login-pet.png" alt="Cute Pets" />
      </div>
    </section>
  )
}