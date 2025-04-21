/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        float: 'float 6s ease-in-out infinite',
        orbit: 'orbit 20s linear infinite',
        twinkle: 'twinkle 4s infinite',
        thruster: 'thruster 0.5s infinite alternate',
        fadeIn: 'fadeIn 0.5s ease-in-out',
        typewriter: 'typewriter 3.5s steps(40, end)',
      },
    },
  },
  plugins: [],
}