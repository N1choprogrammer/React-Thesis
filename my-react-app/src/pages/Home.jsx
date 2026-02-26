import { Link } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

const features = [
  {
    title: "Low running cost",
    body: "Charge at home and spend a fraction compared to traditional fuel. Ideal for daily local commuters.",
    stat: "4x less",
  },
  {
    title: "Easy to maintain",
    body: "Simple electric systems, durable parts, and local support make SPEEGO e-bikes practical and reliable.",
    stat: "Local-ready",
  },
  {
    title: "Environment-friendly",
    body: "Zero direct emissions, less noise, and a more sustainable option for city transport.",
    stat: "Cleaner ride",
  },
]

const steps = [
  {
    number: "01",
    title: "Select your e-bike",
    body: "Browse available models on our shop page and choose the unit that fits your needs.",
  },
  {
    number: "02",
    title: "Place an order",
    body: "Add to cart and submit your order details. Our system records your chosen model, color, and quantity.",
  },
  {
    number: "03",
    title: "Confirm with SPEEGO",
    body: "Our team will contact you to confirm availability, payment options, and delivery or pickup schedule.",
  },
]

function SectionEyebrow({ children, isDark }) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        isDark
          ? "border border-white/10 bg-white/5 text-zinc-300"
          : "border border-black/10 bg-black/[0.03] text-zinc-600",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      {children}
    </div>
  )
}

export default function Home() {
  const { isDark } = useTheme()

  return (
    <div
      className={[
        "relative min-h-screen overflow-x-clip",
        isDark ? "bg-[#050505] text-white" : "bg-transparent text-zinc-900",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={[
            "absolute inset-0 [background-size:34px_34px]",
            isDark
              ? "opacity-[0.07] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]"
              : "opacity-[0.05] [background-image:linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)]",
          ].join(" ")}
        />
        <div className="absolute -left-16 top-8 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-red-500/10 blur-3xl" />
        <div
          className={[
            "absolute left-1/3 top-52 h-56 w-56 rounded-full blur-3xl",
            isDark ? "bg-white/5" : "bg-black/5",
          ].join(" ")}
        />
        <div className="absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 lg:px-8 lg:pb-16 lg:pt-10">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div
            className={[
              "relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm sm:p-8",
              isDark
                ? "border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.02] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
                : "border border-black/10 bg-gradient-to-b from-white to-zinc-50 shadow-[0_20px_60px_rgba(17,24,39,0.08)]",
            ].join(" ")}
          >
            <div className={["absolute right-6 top-6 hidden h-20 w-20 rounded-2xl lg:block", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-black/[0.03]"].join(" ")} />
            <div className="absolute right-10 top-10 hidden h-12 w-12 rounded-full border border-red-400/30 bg-red-500/10 lg:block" />

            <SectionEyebrow isDark={isDark}>SPEEGO ELECTRIC BIKE SHOP</SectionEyebrow>

            <h1 className={["mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
              Smart. Efficient.
              <span className="mt-1 block bg-gradient-to-r from-red-400 via-red-500 to-red-700 bg-clip-text text-transparent">
                Electric Mobility
              </span>
              <span className={["block", isDark ? "text-zinc-200" : "text-zinc-700"].join(" ")}>for Everyday Filipinos.</span>
            </h1>

            <p className={["mt-5 max-w-2xl text-sm leading-7 sm:text-base", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
              SPEEGO offers durable and energy-efficient electric bikes designed for daily commute
              and family use. Less gasoline, less hassle, more savings.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-xl border border-red-500 bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(220,38,38,0.25)] transition hover:-translate-y-0.5 hover:bg-red-500"
              >
                Browse e-bikes
              </Link>
              <Link
                to="/contact"
                className={[
                  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition",
                  isDark
                    ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    : "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-50",
                ].join(" ")}
              >
                Talk to us
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["4x", "Cheaper vs fuel", "Daily savings"],
                ["0", "Gasoline needed", "Electric powered"],
                ["24/7", "Support & service", "Customer assistance"],
              ].map(([value, label, sub]) => (
                <div
                  key={label}
                  className={[
                    "rounded-2xl p-4",
                    isDark
                      ? "border border-white/10 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "border border-black/10 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
                  ].join(" ")}
                >
                  <div className="text-2xl font-black tracking-tight text-red-400">{value}</div>
                  <div className={["mt-1 text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                    {label}
                  </div>
                  <div className={["mt-1 text-xs", isDark ? "text-zinc-500" : "text-zinc-500"].join(" ")}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className={["relative overflow-hidden rounded-3xl p-6", isDark ? "border border-white/10 bg-gradient-to-b from-zinc-900 to-black shadow-[0_30px_80px_rgba(0,0,0,0.5)]" : "border border-black/10 bg-gradient-to-b from-white to-zinc-100 shadow-[0_18px_50px_rgba(17,24,39,0.08)]"].join(" ")}>
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
              <div className="absolute -right-12 -top-8 h-28 w-28 rounded-full border border-red-400/20 bg-red-500/10 blur-xl" />

              <div className={["inline-flex rounded-full px-3 py-1 text-xs font-medium", isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600"].join(" ")}>
                Featured model
              </div>

              <h2 className={["mt-4 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                SPEEGO City Rider
              </h2>
              <p className={["mt-3 text-sm leading-7", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Experience the thrill of speed with our high-performance electric bikes, designed
                for the ultimate ride.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className={["rounded-xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                  <div className={["text-[11px] uppercase tracking-[0.14em]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>Range</div>
                  <div className={["mt-1 text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Up to 40km</div>
                </div>
                <div className={["rounded-xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                  <div className={["text-[11px] uppercase tracking-[0.14em]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                    Charging
                  </div>
                  <div className={["mt-1 text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Fast-charge</div>
                </div>
              </div>

              <ul className={["mt-6 space-y-3 text-sm", isDark ? "text-zinc-200" : "text-zinc-700"].join(" ")}>
                {[
                  "Up to 40km per charge",
                  "Fast-charging battery system",
                  "Family ready design",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-[6px] h-2 w-2 rounded-full bg-red-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/shop"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-red-300 transition hover:text-red-200"
              >
                View models <span aria-hidden="true">{"->"}</span>
              </Link>
            </div>

            <div className={["rounded-3xl p-5", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white/80"].join(" ")}>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Battery", "Fast charge"],
                  ["Comfort", "Family ready"],
                  ["Support", "Local service"],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className={[
                      "rounded-xl px-4 py-3",
                      isDark ? "border border-white/10 bg-black/30" : "border border-black/10 bg-white",
                    ].join(" ")}
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">{title}</div>
                    <div className={["mt-1 text-sm font-semibold", isDark ? "text-zinc-100" : "text-zinc-900"].join(" ")}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className={["overflow-hidden rounded-2xl", isDark ? "border border-white/10 bg-zinc-950/80" : "border border-black/10 bg-white/90"].join(" ")}>
          <div className={["flex min-w-max animate-[none] gap-3 px-4 py-3 text-xs uppercase tracking-[0.18em] sm:text-sm", isDark ? "text-zinc-300" : "text-zinc-700"].join(" ")}>
            {[
              "Electric savings",
              "Daily commute ready",
              "Family use",
              "Low maintenance",
              "Local support",
              "Smart mobility",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="text-red-400">/</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={["rounded-3xl p-6 sm:p-8", isDark ? "border border-white/10 bg-zinc-950/80" : "border border-black/10 bg-white/90"].join(" ")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionEyebrow isDark={isDark}>Why SPEEGO</SectionEyebrow>
              <h2 className={["mt-3 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                Built for real roads, traffic, and budgets
              </h2>
              <p className={["mt-2 max-w-3xl text-sm leading-7 sm:text-base", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
                Our e-bikes are designed for Philippine conditions so they stay practical, durable,
                and affordable for everyday riding.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={[
                  "group relative overflow-hidden rounded-2xl p-5 transition duration-200 hover:-translate-y-1 hover:border-red-400/30",
                  isDark
                    ? "border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02]"
                    : "border border-black/10 bg-gradient-to-b from-white to-zinc-50",
                ].join(" ")}
              >
                <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-red-500/10 blur-2xl transition group-hover:bg-red-500/20" />
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <span className={["inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", isDark ? "border border-white/10 bg-black/40 text-zinc-200" : "border border-black/10 bg-white text-zinc-700"].join(" ")}>
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
                      {feature.stat}
                    </span>
                  </div>
                  <h3 className={["text-base font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{feature.title}</h3>
                  <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={["rounded-3xl p-6 sm:p-8", isDark ? "border border-white/10 bg-gradient-to-br from-zinc-950 to-zinc-900" : "border border-black/10 bg-gradient-to-br from-white to-zinc-100"].join(" ")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionEyebrow isDark={isDark}>How To Order</SectionEyebrow>
              <h2 className={["mt-3 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                Simple process, direct confirmation
              </h2>
              <p className={["mt-2 max-w-3xl text-sm leading-7 sm:text-base", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
                Explore online and submit your order details. SPEEGO will confirm availability,
                payment options, and delivery or pickup schedule.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className={[
                  "relative rounded-2xl p-5",
                  isDark ? "border border-white/10 bg-black/25" : "border border-black/10 bg-white/80",
                ].join(" ")}
              >
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 px-3 text-sm font-bold text-red-300">
                    {step.number}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    Step
                  </div>
                </div>
                <h3 className={["text-base font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{step.title}</h3>
                <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className={["relative overflow-hidden rounded-3xl border border-red-400/20 p-6 sm:p-8", isDark ? "bg-gradient-to-r from-zinc-950 via-black to-zinc-950 shadow-[0_25px_70px_rgba(0,0,0,0.35)]" : "bg-gradient-to-r from-white via-zinc-50 to-white shadow-[0_16px_45px_rgba(17,24,39,0.08)]"].join(" ")}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-red-400/10 bg-red-500/10 blur-2xl" />
          <div className={["pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full blur-2xl", isDark ? "bg-white/5" : "bg-black/5"].join(" ")} />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SectionEyebrow isDark={isDark}>Start Today</SectionEyebrow>
              <h2 className={["mt-3 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                Ready to experience electric mobility?
              </h2>
              <p className={["mt-2 max-w-2xl text-sm leading-7 sm:text-base", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Visit the shop page to explore SPEEGO models or reach out for personalized
                recommendations based on your budget and daily route.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-xl border border-red-500 bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500"
              >
                Explore e-bikes
              </Link>
              <Link
                to="/contact"
                className={[
                  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition",
                  isDark
                    ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    : "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-50",
                ].join(" ")}
              >
                Contact SPEEGO
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
