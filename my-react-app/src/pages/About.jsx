import SpeeGo_Fam from "../Pictures/SpeeGo-Family.jpg"
import { useTheme } from "../context/ThemeContext"

export default function About() {
  const { isDark } = useTheme()

  return (
    <div
      className={[
        "relative min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6 lg:px-8",
        isDark ? "bg-black text-white" : "bg-transparent text-zinc-900",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={[
            "absolute inset-0",
            isDark
              ? "bg-[radial-gradient(circle_at_10%_8%,rgba(239,68,68,0.10),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(255,255,255,0.04),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.2),rgba(0,0,0,0.92))]"
              : "bg-[radial-gradient(circle_at_10%_8%,rgba(239,68,68,0.08),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(17,24,39,0.04),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]",
          ].join(" ")}
        />
        <div
          className={[
            "absolute inset-0 [background-size:24px_24px]",
            isDark
              ? "opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]"
              : "opacity-[0.05] [background-image:linear-gradient(rgba(17,24,39,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.10)_1px,transparent_1px)]",
          ].join(" ")}
        />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6">
        <section
          className={[
            "overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-8",
            isDark
              ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute" />
          <div className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
            isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600 ",
          ].join(" ")}>
            About Speego
          </div>
          <h1 className={["mt-3 text-3xl font-bold tracking-tight sm:text-4xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
            About SPEEGO
          </h1>
          <p className={["mt-3 max-w-4xl text-sm leading-7 sm:text-base", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            At SpeeGo, we are passionate about revolutionizing the way you travel. Our electric
            bikes are designed to provide a seamless blend of speed, style, and sustainability.
            Whether you&apos;re commuting through the city or exploring scenic routes, our e-bikes
            offer an exhilarating ride that is both eco-friendly and efficient.
          </p>

          <div className={["mt-6 overflow-hidden rounded-2xl", isDark ? "border border-white/10 bg-black/30" : "border border-black/10 bg-white"].join(" ")}>
            <img
              src={SpeeGo_Fam}
              alt="About SpeeGo Family"
              className="h-56 w-full object-cover sm:h-72 lg:h-[420px]"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className={["rounded-2xl p-5", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
              <h2 className={["text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Who we are</h2>
              <div className={["mt-3 space-y-4 text-sm leading-7", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                <p>
                  Our journey began on April 28, 2024, fueled by a simple but powerful idea: to
                  make eco-friendly, stylish, and affordable transportation accessible to everyone.
                  What started as a small dream quickly turned into a mission to reinvent the way
                  people move with comfort, safety, and personality.
                </p>
                <p>
                  SPEEGO specializes in electric bikes designed for real Philippine conditions:
                  traffic, narrow streets, and long daily commutes. Our goal is to help students,
                  workers, and small businesses save on fuel and time while enjoying a cleaner and
                  quieter ride.
                </p>
              </div>
            </div>

            <div className={["rounded-2xl p-5", isDark ? "border border-white/10 bg-black/30" : "border border-black/10 bg-zinc-50"].join(" ")}>
              <h3 className={["text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>System objectives</h3>
              <ul className={["mt-4 space-y-3 text-sm", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>Provide an online catalog of SPEEGO electric bikes.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>Allow customers to place orders anytime using a web interface.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>Reach more people outside Talavera.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>Promote SPEEGO&apos;s electric bike brand and values.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className={[
            "rounded-3xl p-5 sm:p-6 lg:p-8",
            isDark
              ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
          ].join(" ")}
        >
          <div className={["inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600"].join(" ")}>
            Why E-Bikes
          </div>
          <h2 className={["mt-3 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
            Why electric bikes?
          </h2>
          <p className={["mt-2 max-w-3xl text-sm leading-7 sm:text-base", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            Electric bikes reduce daily transportation costs, lower carbon emissions, and provide a
            more flexible way to travel around crowded cities.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className={["rounded-2xl p-5", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
              <h3 className={["text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Cost-efficient</h3>
              <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Charging an e-bike is significantly cheaper than buying gasoline. Over time, this
                helps riders save money while maintaining mobility.
              </p>
            </div>

            <div className={["rounded-2xl p-5", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
              <h3 className={["text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Low maintenance</h3>
              <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Electric motors have fewer moving parts than traditional engines, resulting in less
                wear and fewer repairs for everyday use.
              </p>
            </div>

            <div className={["rounded-2xl p-5", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
              <h3 className={["text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Eco friendly</h3>
              <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Experience the thrill of riding while reducing your carbon footprint.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
