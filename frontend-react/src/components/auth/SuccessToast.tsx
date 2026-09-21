// Success toast — parity with signup.html `#successToast` + `.success-toast`
// styles (slide-in, green left border). Used by the signup flow.

import { Icon } from '../shared/Icon'

interface SuccessToastProps {
  show: boolean
  title: string
  message: string
}

export function SuccessToast({ show, title, message }: SuccessToastProps) {
  return (
    <div id="successToast" className={`success-toast${show ? ' show' : ''}`} role="status">
      <Icon name="circle-check" />
      <div>
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    </div>
  )
}