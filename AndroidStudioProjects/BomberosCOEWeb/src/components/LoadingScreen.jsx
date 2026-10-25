/**
 * Pantalla de carga del COE.
 *
 * Muestra el escudo del Cuerpo de Bomberos de Miranda girando en 3D
 * (efecto moneda sobre su propio eje vertical, hacia la derecha)
 * mientras se carga el contenido de la página.
 *
 * Completamente transparente: solo el escudo recortado (PNG con alfa),
 * sin fondos, cajas ni contenedores detrás. Cuando App detecta que la
 * página y los datos terminaron de cargar, activa `fading` para la
 * transición de salida (fade-out) y luego desmonta este componente.
 */
export default function LoadingScreen({ fading = false }) {
  return (
    <div
      className={`loading-overlay ${fading ? "loading-overlay-hide" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando contenido"
    >
      {/* Escena 3D: moneda con dos caras para un giro con volumen real */}
      <div className="loading-shield-scene">
        <div className="loading-shield-coin">
          <img
            src="./escudo-bomberos-miranda.png"
            alt="Escudo del Cuerpo de Bomberos de Miranda"
            className="loading-shield-face"
            draggable="false"
          />
          <img
            src="./escudo-bomberos-miranda.png"
            alt=""
            aria-hidden="true"
            className="loading-shield-face loading-shield-face-back"
            draggable="false"
          />
        </div>
      </div>
      <h1 className="loading-title">COE · Bomberos Miranda</h1>
      <div className="loading-track" aria-hidden="true">
        <div className="loading-bar" />
      </div>
      <p className="loading-subtitle">Cargando contenido…</p>
    </div>
  )
}