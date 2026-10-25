// Las variables de src/index.css cambian con el tema; color-mix permite usar
// opacidades de Tailwind (bg-tactical-red/10) sobre colores definidos en variables.
const v = (nombre) => `color-mix(in srgb, var(${nombre}) calc(<alpha-value> * 100%), transparent)`

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg:       v("--t-bg"),
          surface:  v("--t-surface"),
          card:     v("--t-card"),
          cardAlt:  v("--t-card-alt"),
          border:   v("--t-border"),
          red:      v("--t-red"),
          redSolid: v("--t-red-solid"),
          redBright:v("--t-red"),
          gold:     v("--t-amber"),
          amber:    v("--t-amber"),
          onAmber:  v("--t-on-amber"),
          green:    v("--t-green"),
          blue:     v("--t-blue"),
          gps:      v("--t-gps"),
          text:     v("--t-text"),
          muted:    v("--t-muted"),
        }
      },
      boxShadow: {
        card: "var(--t-shadow)",
      },
    }
  },
  plugins: []
}
