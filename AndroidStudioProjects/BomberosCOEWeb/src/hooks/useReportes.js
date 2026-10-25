import { useEffect, useState } from "react"
import { escucharReportes, escucharUsuarios } from "../supabase"

// Solo escuchan con sesión iniciada: sin sesión la base de datos no entrega nada.
export function useReportes(activo) {
  const [reportes, setReportes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activo) { setReportes([]); return }
    setLoading(true)
    return escucharReportes(lista => {
      setReportes(lista)
      setLoading(false)
    })
  }, [activo])

  return { reportes, loading }
}

export function useUsuarios(activo) {
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    if (!activo) { setUsuarios([]); return }
    return escucharUsuarios(setUsuarios)
  }, [activo])

  return { usuarios }
}
