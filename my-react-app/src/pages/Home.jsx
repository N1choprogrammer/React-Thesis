import { Link } from "react-router-dom"

export default function Home() {
  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section className="home-hero">
        <div className="home-hero-grid">
          <div className="home-hero-text">
            <span className="home-tag">SPEEGO ELECTRIC BIKE SHOP</span>
            <h1 className="home-hero-title">
              Smart. Efficient. <span>Electric Mobility</span> for Everyday Filipinos.
            </h1>
            <p className="home-hero-subtitle">
              SPEEGO offers durable and energy-efficient electric bikes designed for daily commute,
              and family use. Less gasoline, less hassle, more savings.
            </p>

            <div className="home-hero-actions">
              <Link to="/shop" className="btn btn-primary">
                Browse e-bikes
              </Link>
              <Link to="/contact" className="btn btn-outline">
                Talk to us
              </Link>
            </div>

            <div className="home-hero-metrics">
              <div className="metric-item">
                <span className="metric-value">4x</span>
                <span className="metric-label">Cheaper vs fuel</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">0</span>
                <span className="metric-label">Gasoline needed</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">24/7</span>
                <span className="metric-label">Support & service</span>
              </div>
            </div>
          </div>

          <div className="home-hero-visual">
            <div className="home-hero-card">
              <div className="home-hero-label">Featured model</div>
              <h2 className="home-hero-bike-name">SPEEGO City Rider</h2>
              <p className="home-hero-bike-desc">
                Experience the thrill of speed with our high-performance electric bikes, designed for the ultimate ride.
              </p>
              <ul className="home-hero-specs">
                <li>🔋 Up to 40km per charge</li>
                <li>⚡ Fast-charging battery system</li>
                <li>👨‍👩‍👧  Family ready</li>
              </ul>
              <Link to="/shop" className="home-hero-link">
                View models →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE SPEEGO */}
      <section className="home-section">
        <h2 className="home-section-title">Why choose SPEEGO?</h2>
        <p className="home-section-subtitle">
          Built for real roads, real traffic, and real budgets. Our e-bikes are designed for
          Philippine conditions.
        </p>

        <div className="home-feature-grid">
          <div className="home-feature-card">
            <h3>Low running cost</h3>
            <p>
              Charge at home and spend a fraction compared to traditional fuel. Ideal for daily
              local commuters.
            </p>
          </div>
          <div className="home-feature-card">
            <h3>Easy to maintain</h3>
            <p>
              Simple electric systems, durable parts, and local support make SPEEGO e-bikes practical
              and reliable.
            </p>
          </div>
          <div className="home-feature-card">
            <h3>Environment-friendly</h3>
            <p>
              Zero direct emissions, less noise, and a more sustainable option for city transport.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="home-section">
        <h2 className="home-section-title">How to order</h2>
        <p className="home-section-subtitle">
          Our process is simple. You can explore online and finalize orders through direct
          communication with our team.
        </p>

        <div className="home-steps">
          <div className="home-step">
            <div className="home-step-number">1</div>
            <h3>Select your e-bike</h3>
            <p>Browse available models on our shop page and choose the unit that fits your needs.</p>
          </div>
          <div className="home-step">
            <div className="home-step-number">2</div>
            <h3>Place an order</h3>
            <p>
              Add to cart and submit your order details. Our system records your chosen model,
              color, and quantity.
            </p>
          </div>
          <div className="home-step">
            <div className="home-step-number">3</div>
            <h3>Confirm with SPEEGO</h3>
            <p>
              Our team will contact you to confirm availability, payment options, and delivery or
              pickup schedule.
            </p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="home-cta">
        <div className="home-cta-inner">
          <div>
            <h2>Ready to experience electric mobility?</h2>
            <p>
              Visit the shop page to explore SPEEGO models or reach out to us for personalized
              recommendations.
            </p>
          </div>
          <div className="home-cta-actions">
            <Link to="/shop" className="btn btn-primary">
              Explore e-bikes
            </Link>
            <Link to="/contact" className="btn btn-outline">
              Contact SPEEGO
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
