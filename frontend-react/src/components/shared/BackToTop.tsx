import { useEffect, useState } from 'react'
import { Icon } from './Icon'

// Parity with frontend/js/main.js + the scroll visibility half of home.js:
// shows the button after scrolling 300px (`#backToTop.show`), smooth-scrolls
// to top on click. Styling comes from the ported footer.css.

export function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      id="backToTop"
      type="button"
      aria-label="Back to Top"
      className={show ? 'show' : undefined}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <Icon name="chevron-up" />
    </button>
  )
}