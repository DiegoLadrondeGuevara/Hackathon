import { useState, useEffect } from "react"

interface Reporte {
  tenant_id: string
  uuid: string
  tipo_incidente: string
  nivel_urgencia: string
  ubicacion: string
  tipo_usuario: string
  descripcion: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://4iyael92qd.execute-api.us-east-1.amazonaws.com/dev"

function App() {
  const TENANT_ID = "utec" // 🔥 DEFAULT TENANT

  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null)
  const [showDetails, setShowDetails] = useState<boolean>(false)

  // ===============================
  // LISTAR REPORTES
  // ===============================
  const fetchReportes = async () => {
    setLoading(true)
    setError("")

    try {
      const resp = await fetch(
        `${API_BASE_URL}/reporte/listar?tenant_id=${TENANT_ID}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }
      )

      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.error || data.mensaje)
      }

      setReportes(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes")
      setReportes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportes()
  }, [])

  // ===============================
  // OBTENER DETALLE
  // ===============================
  const fetchReporteDetalle = async (uuid: string) => {
    setLoading(true)
    setError("")

    try {
      const resp = await fetch(
        `${API_BASE_URL}/reporte/${uuid}?tenant_id=${TENANT_ID}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }
      )

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || data.mensaje)

      setSelectedReporte(data.item)
      setShowDetails(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el reporte")
    } finally {
      setLoading(false)
    }
  }

  // ===============================
  // ELIMINAR REPORTE
  // ===============================
  const handleEliminar = async (uuid: string) => {
    if (!confirm("¿Seguro de eliminar este reporte?")) return

    setLoading(true)
    setError("")

    try {
      const resp = await fetch(
        `${API_BASE_URL}/reporte/${uuid}?tenant_id=${TENANT_ID}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" }
        }
      )

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || data.mensaje)

      await fetchReportes() // recargar lista

      // quitar selección si era ese
      if (selectedReporte?.uuid === uuid) {
        setSelectedReporte(null)
        setShowDetails(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el reporte")
    } finally {
      setLoading(false)
    }
  }

  // ===============================
  // STYLE PARA URGENCIA
  // ===============================
  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia?.toLowerCase()) {
      case "alta": return "text-red-700 bg-red-100"
      case "media": return "text-yellow-700 bg-yellow-100"
      case "baja": return "text-green-700 bg-green-100"
      default: return "text-gray-700 bg-gray-100"
    }
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-black mb-2">
          Panel de Administración — UTEC
        </h1>
        <p className="text-gray-600">
          Administración de reportes del tenant <b>"utec"</b>.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* DETALLES */}
      {showDetails && selectedReporte && (
        <div className="max-w-4xl mx-auto mb-8 p-6 bg-gray-50 border rounded-lg">
          <h2 className="text-lg font-semibold text-black mb-4">
            Detalles del Reporte
          </h2>

          <p><b>UUID:</b> {selectedReporte.uuid}</p>
          <p><b>Tipo:</b> {selectedReporte.tipo_incidente}</p>
          <p><b>Urgencia:</b> {selectedReporte.nivel_urgencia}</p>
          <p><b>Ubicación:</b> {selectedReporte.ubicacion}</p>
          <p><b>Usuario:</b> {selectedReporte.tipo_usuario}</p>
          <p><b>Descripción:</b> {selectedReporte.descripcion}</p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleEliminar(selectedReporte.uuid)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg"
            >
              Eliminar
            </button>
            <button
              onClick={() => {
                setSelectedReporte(null)
                setShowDetails(false)
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="max-w-4xl mx-auto">
        {loading && reportes.length === 0 ? (
          <p className="text-gray-500 text-lg text-center">Cargando reportes…</p>
        ) : reportes.length === 0 ? (
          <p className="text-gray-500 text-lg text-center">No hay reportes</p>
        ) : (
          <div className="space-y-4">
            {reportes.map((r) => (
              <div
                key={r.uuid}
                className="bg-white border p-4 rounded-lg hover:shadow-md"
              >
                <h3 className="font-bold text-lg">{r.tipo_incidente}</h3>
                <p>📍 {r.ubicacion}</p>
                <p className="mt-1">{r.descripcion}</p>

                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${getUrgenciaColor(
                    r.nivel_urgencia
                  )}`}
                >
                  {r.nivel_urgencia}
                </span>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => fetchReporteDetalle(r.uuid)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Ver Detalles
                  </button>
                  <button
                    onClick={() => handleEliminar(r.uuid)}
                    className="text-red-600 font-semibold text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
