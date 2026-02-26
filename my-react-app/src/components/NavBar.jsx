import { NavLink, useNavigate } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { supabase } from "../services/supabaseClient"
import { useEffect, useState } from "react"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"
import { useTheme } from "../context/ThemeContext"

function NavItem({ to, children, onClick, isDark }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "rounded-xl px-4 py-3 text-base font-semibold transition lg:px-5 lg:py-3.5 lg:text-[17px]",
          isActive
            ? (isDark ? "bg-red-500/12 text-red-300" : "bg-red-500/10 text-red-700")
            : isDark
              ? "text-zinc-300 hover:bg-white/5 hover:text-white"
              : "text-zinc-700 hover:bg-black/5 hover:text-zinc-900",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  )
}

export default function NavBar() {
  const { isDark, toggleTheme } = useTheme()
  const { cart } = useCart()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMobileOpen(false)
    navigate("/login")
  }

  const handleLogin = () => {
    setMobileOpen(false)
    navigate("/login")
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <header className={["sticky top-0 z-50 backdrop-blur", isDark ? "bg-black/70" : "bg-white/70"].join(" ")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={[
            "relative mt-2 overflow-hidden rounded-2xl px-2 lg:mt-3 lg:rounded-3xl lg:px-3",
            isDark
              ? "border border-white/10 bg-zinc-950/85 shadow-[0_18px_40px_rgba(0,0,0,0.28)] lg:shadow-[0_24px_60px_rgba(0,0,0,0.32)]"
              : "border border-black/10 bg-white/90 shadow-[0_18px_40px_rgba(0,0,0,0.10)] lg:shadow-[0_24px_60px_rgba(0,0,0,0.12)]",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
          <div className={["pointer-events-none absolute -left-8 top-4 h-20 w-20 rounded-full blur-2xl", isDark ? "bg-red-500/10" : "bg-red-500/15"].join(" ")} />
          <div className={["pointer-events-none absolute right-8 top-2 h-16 w-16 rounded-full blur-2xl", isDark ? "bg-white/5" : "bg-black/5"].join(" ")} />
          <div className="flex h-20 items-center gap-4 lg:h-28 lg:gap-6">
          <NavLink
            to="/"
            className={[
              "flex items-center gap-3 rounded-2xl px-2 py-2 transition lg:min-w-[240px] lg:gap-4 lg:px-3 lg:py-2.5",
              isDark ? "hover:bg-white/5" : "hover:bg-black/5",
            ].join(" ")}
            onClick={closeMobile}
          >
            <img
              src={logo}
              alt="Speego"
              className={[
                "h-11 w-11 rounded-xl object-cover lg:h-16 lg:w-16 lg:rounded-2xl",
                isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-zinc-100",
              ].join(" ")}
            />
            <div className="hidden sm:block">
              <div className={["text-lg font-black tracking-[0.12em] lg:text-2xl lg:leading-none", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                SPEEGO
              </div>
              <div className={["text-xs uppercase tracking-[0.18em] lg:mt-1 lg:text-[13px]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                Electric Mobility
              </div>
            </div>
          </NavLink>

          <nav className="ml-2 hidden flex-1 items-center justify-center gap-2 md:flex lg:gap-2.5">
            <NavItem to="/" isDark={isDark}>Home</NavItem>
            <NavItem to="/shop" isDark={isDark}>Shop</NavItem>
            <NavItem to="/about" isDark={isDark}>About</NavItem>
            <NavItem to="/contact" isDark={isDark}>Contact</NavItem>
            {session && (
              <>
                <NavItem to="/my-orders" isDark={isDark}>My Orders</NavItem>
                <NavItem to="/profile" isDark={isDark}>Profile</NavItem>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:min-w-[280px] lg:justify-end lg:gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className={[
                "hidden md:inline-flex items-center rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition lg:rounded-2xl lg:px-4 lg:py-3.5 lg:text-base",
                isDark
                  ? "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                  : "border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
              ].join(" ")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? "Light" : "Dark"}
            </button>
            <NavLink
              to="/cart"
              onClick={closeMobile}
              className={({ isActive }) =>
                [
                  "relative inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition",
                  "lg:rounded-2xl lg:px-5 lg:py-3.5 lg:text-base",
                  isActive
                    ? isDark
                      ? "border-red-400/40 bg-red-500/10 text-red-300"
                      : "border-red-400/40 bg-red-500/10 text-red-700"
                    : isDark
                      ? "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      : "border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
                ].join(" ")
              }
            >
              <span>Cart</span>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white lg:h-7 lg:min-w-7 lg:text-[12px]">
                {cart.length}
              </span>
            </NavLink>

            <div className="hidden md:block">
              {!session ? (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-xl border border-red-500 bg-red-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-red-500 lg:rounded-2xl lg:px-6 lg:py-3.5 lg:text-[17px]"
                >
                  Sign in / Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className={[
                    "rounded-xl px-5 py-2.5 text-base font-semibold transition lg:rounded-2xl lg:px-6 lg:py-3.5 lg:text-[17px]",
                    isDark
                      ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
                  ].join(" ")}
                >
                  Logout
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className={[
                "inline-flex h-11 w-11 items-center justify-center rounded-xl transition md:hidden",
                isDark
                  ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                  : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
              ].join(" ")}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <span className="text-lg leading-none">{mobileOpen ? "x" : "="}</span>
            </button>
          </div>
          </div>

        {mobileOpen && (
          <div className={["py-3 md:hidden", isDark ? "border-t border-white/10" : "border-t border-black/10"].join(" ")}>
            <nav className="grid gap-1">
              <NavItem to="/" onClick={closeMobile} isDark={isDark}>
                Home
              </NavItem>
              <NavItem to="/shop" onClick={closeMobile} isDark={isDark}>
                Shop
              </NavItem>
              <NavItem to="/about" onClick={closeMobile} isDark={isDark}>
                About
              </NavItem>
              <NavItem to="/contact" onClick={closeMobile} isDark={isDark}>
                Contact
              </NavItem>
              {session && (
                <>
                  <NavItem to="/my-orders" onClick={closeMobile} isDark={isDark}>
                    My Orders
                  </NavItem>
                  <NavItem to="/profile" onClick={closeMobile} isDark={isDark}>
                    Profile
                  </NavItem>
                </>
              )}
            </nav>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className={[
                  "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  isDark
                    ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                    : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
                ].join(" ")}
              >
                Switch to {isDark ? "Light" : "Dark"} Mode
              </button>
              {!session ? (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-xl border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                >
                  Sign in / Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className={[
                    "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                    isDark
                      ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
                  ].join(" ")}
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  )
}
