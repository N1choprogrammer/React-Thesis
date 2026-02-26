/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  // Keep existing global styles stable while migrating page-by-page.
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
