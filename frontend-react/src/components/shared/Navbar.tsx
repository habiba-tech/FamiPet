import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { Icon } from './Icon'

// Parity with the Vanilla landing header (frontend/index.html). The nav links
// anchor to on-page sections; "Home" carries the static active state exactly
// as in the original markup. The mobile `.menu-toggle` renders the bars icon
// but has no open behavior in Vanilla (responsive.css just unhides it <=992px).

const navLinks = [
  { label: 'Home', href: '#home', active: true },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Why Us', href: '#why-us' },
  { label: 'Join Us', href: '#join-us' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  return (
    <header className="header">
      <div className="container navbar">
        <Link to="/" className="logo" aria-label="Famipet home">
          <img src="/assets/logos/Famipet.png" alt="Famipet Logo" />
        </Link>

        <nav className="nav-menu">
          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={link.active ? 'active' : undefined}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav-right">
          <ThemeToggle />

          <Link to="/login" className="login-btn">
            Login
          </Link>

          <Link to="/signup" className="signup-btn">
            Sign Up
          </Link>
        </div>

        <div className="menu-toggle">
          <Icon name="menu" />
        </div>
      </div>
    </header>
  )
}