import { Link } from "react-router-dom"

export default function Home() {
  return (
    <section className="hero">
      <div className="hero-left">
        <h1>
          Built for <span>Speed</span>.  
          Designed for the <span>City</span>.
        </h1>

        <p>
          SPEEGO electric bikes deliver power, reliability, and modern design —
          perfect for daily commutes and high-performance riding.
        </p>

        <div className="hero-actions">
          <Link to="/shop" className="btn btn-primary">
            Shop E-Bikes
          </Link>
          <Link to="/about" className="btn btn-outline">
            Learn More
          </Link>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-card">
          <p className="tag">Featured Model</p>
          <h3>SPEEGO Urban X</h3>
          <p className="specs">80km range · 48V battery · Disc brakes</p>
          <p className="price">₱69,990</p>
        </div>
      </div>
    </section>
  )
}
