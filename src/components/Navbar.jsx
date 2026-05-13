import './Navbar.css'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbarInner">
        <Link className="navbarBrand" to="/" aria-label="Cloudrop home">
          <span className="navbarLogo" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M7.5 18.5h9.25c2.08 0 3.75-1.66 3.75-3.71 0-1.8-1.3-3.33-3.02-3.64-.44-2.9-2.97-5.15-6.05-5.15-2.61 0-4.86 1.6-5.75 3.88C3.6 10.22 2 11.94 2 14.05c0 2.45 2.02 4.45 4.5 4.45Z"
                fill="currentColor"
                opacity="0.9"
              />
              <path
                d="M12 11.25c.38 0 .7.3.7.67v5.11a.7.7 0 0 1-1.4 0v-5.1c0-.38.32-.68.7-.68Z"
                fill="currentColor"
              />
              <path
                d="M12 8.5c.2 0 .4.08.54.22l2.1 2.07a.64.64 0 0 1 0 .93.69.69 0 0 1-.96 0L12 10.1l-1.68 1.62a.69.69 0 0 1-.96 0 .64.64 0 0 1 0-.93l2.1-2.07c.14-.14.33-.22.54-.22Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="navbarName">Cloudrop</span>
        </Link>
      </div>
    </header>
  )
}
