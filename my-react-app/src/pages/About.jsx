// src/pages/About.jsx
import "./About.css";
import SpeeGo_Fam from "../Pictures/SpeeGo-Family.jpg"

export default function About() {
  return (
    <div className="about-page">
      {/* Top section: who you are */}
      <section className="about-hero">
        <h1 className="page-title">About SPEEGO</h1>
        <p className="page-subtitle">
          At SpeeGo, we are passionate about revolutionizing the way you travel. Our electric bikes are designed to provide you with a seamless blend of speed, style, and sustainability. Whether you're commuting through the city or exploring scenic routes, our e-bikes offer an exhilarating ride that is both eco-friendly and efficient.
        </p>
        <div className="about-image-wrapper">
        <img
          src={SpeeGo_Fam}
          alt="About SpeeGo Family"
          className="about-image"
        />
      </div>
        <div className="about-hero-grid">
          <div className="about-hero-text">
            <h2>Who we are</h2>
            <p>
              Our journey began on April 28, 2024, fueled by a simple but powerful idea: to make eco-friendly, stylish, and affordable transportation accessible to everyone. What started as a small dream quickly turned into a passionate mission to reinvent the way people move with comfort, safety, and a whole lot of personality.
            </p>
            <p>
              SPEEGO specializes in electric bikes designed for real Philippine conditions —
              traffic, narrow streets, and long daily commutes. Our goal is to help students,
              workers, and small businesses save on fuel and time while enjoying a cleaner and
              quieter ride.
            </p>
            
          </div>

          <div className="about-hero-card">
            <h3>System objectives</h3>
            <ul>
              <li>Provide an online catalog of SPEEGO electric bikes.</li>
              <li>Allow customers to place orders anytime using a web interface.</li>
              <li>Reach more people outside Talavera</li>
              <li>Promote SPEEGO's electric bike brand and values</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Middle section: what makes SPEEGO different */}
      <section className="about-section">
        <h2 className="about-section-title">Why electric bikes?</h2>
        <p className="about-section-subtitle">
          Electric bikes reduce daily transportation costs, lower carbon emissions, and provide a
          more flexible way to travel around crowded cities.
        </p>

        <div className="about-feature-grid">
          <div className="about-feature-card">
            <h3>Cost-efficient</h3>
            <p>
              Charging an e-bike is significantly cheaper than buying gasoline. Over time, this
              helps riders save money while maintaining mobility.
            </p>
          </div>
          <div className="about-feature-card">
            <h3>Low maintenance</h3>
            <p>
              Electric motors have fewer moving parts than traditional engines, resulting in less
              wear and fewer repairs for everyday use.
            </p>
          </div>
          <div className="about-feature-card">
            <h3>Eco Friendly</h3>
            <p>
              Experience the thrill of riding while reducing your carbon footprint.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
