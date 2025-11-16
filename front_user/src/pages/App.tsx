import { useEffect, useState, useRef } from "react";

interface Incident {
  uuid?: string;
  tipo_incidente?: string;
  ubicacion?: string;
  descripcion?: string;
  tipo_usuario?: string;
  nivel_urgencia?: string;
  estado?: string;
}

interface BackendPayload {
  tenant_id: string;
  tipo_incidente: string;
  ubicacion: string;
  tipo_usuario: string;
  descripcion: string;
}

// ================================
// CONFIG
// ================================
const API_URL =
  "https://4iyael92qd.execute-api.us-east-1.amazonaws.com/dev/reporte/crear";

const WS_URL =
  "wss://xxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev"; // ← pon tu URL WS

function App() {
  // ================================
  // ESTADOS
  // ================================
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    tipo: "",
    ubicacion: "",
    descripcion: "",
    rol: "",
  });

  const ws = useRef<WebSocket | null>(null);

  // ================================
  // INICIO DEL WEBSOCKET
  // ================================
  useEffect(() => {
    console.log("Conectando WebSocket...");

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log("✅ WebSocket conectado");

      // Registrar username
      ws.current?.send(
        JSON.stringify({
          action: "register",
          username: "admin", // ← puedes cambiar a "usuario"
        })
      );
    };

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("📩 WS message:", msg);

      if (msg.type === "incidentsList") {
        // Lista inicial de incidentes desde DynamoDB
        setIncidents(msg.incidents);
      }

      if (msg.type === "newIncident") {
        // Nuevo incidente creado por un usuario
        setIncidents((prev) => [...prev, msg.incident]);
      }
    };

    ws.current.onclose = () => {
      console.log("❌ WebSocket cerrado");
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  // ================================
  // API CALL
  // ================================
  async function crearIncidente(data: BackendPayload) {
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("API error:", resp.status, text);
        throw new Error(`API request failed: ${resp.status}`);
      }

      const json = await resp.json();
      return json;
    } catch (err) {
      console.error("Failed to crearIncidente:", err);
      throw err;
    }
  }

  // ================================
  // CREAR INCIDENTE
  // ================================
  const handleAddIncident = async () => {
    const { tipo, ubicacion, descripcion, rol } = formData;

    if (!tipo || !ubicacion || !descripcion || !rol) {
      alert("Completa todos los campos");
      return;
    }

    const payload: BackendPayload = {
      tenant_id: "utec",
      tipo_incidente: tipo,
      ubicacion,
      tipo_usuario: rol,
      descripcion,
    };

    // Optimistic UI
    setIncidents((prev) => [
      ...prev,
      {
        tipo_incidente: tipo,
        ubicacion,
        descripcion,
        tipo_usuario: rol,
        estado: "pendiente",
      },
    ]);

    try {
      await crearIncidente(payload);
    } catch {
      alert("Error enviando el reporte.");
    }

    setFormData({
      tipo: "",
      ubicacion: "",
      descripcion: "",
      rol: "",
    });

    setShowForm(false);
  };

  // ================================
  // RENDER
  // ================================
  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-black mb-2">
          Reportes de Incidentes
        </h1>
        <p className="text-gray-600">
          Gestiona y registra incidentes dentro del campus (modo tiempo real).
        </p>
      </div>

      {/* Botón Abrir Formulario */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Crear Nuevo Incidente
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="max-w-4xl mx-auto mb-8 bg-gray-50 p-6 rounded-lg border border-gray-300">
          <h2 className="text-lg font-semibold text-black mb-4">
            Nuevo Reporte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              value={formData.tipo}
              onChange={(e) =>
                setFormData({ ...formData, tipo: e.target.value })
              }
              className="border border-gray-400 rounded-lg px-4 py-2 text-black"
            >
              <option value="">Tipo de incidente</option>
              <option value="Robo">Robo</option>
              <option value="Accidente">Accidente</option>
              <option value="Acoso">Acoso</option>
              <option value="Daño a propiedad">Daño a propiedad</option>
              <option value="Otro">Otro</option>
            </select>

            <input
              type="text"
              placeholder="Ubicación"
              value={formData.ubicacion}
              onChange={(e) =>
                setFormData({ ...formData, ubicacion: e.target.value })
              }
              className="border border-gray-400 rounded-lg px-4 py-2 text-black"
            />

            <select
              value={formData.rol}
              onChange={(e) =>
                setFormData({ ...formData, rol: e.target.value })
              }
              className="border border-gray-400 rounded-lg px-4 py-2 text-black"
            >
              <option value="">Selecciona tu rol</option>
              <option value="estudiante">Estudiante</option>
              <option value="administrativo">Personal administrativo</option>
              <option value="autoridad">Autoridad</option>
            </select>
          </div>

          <textarea
            placeholder="Descripción detallada..."
            value={formData.descripcion}
            onChange={(e) =>
              setFormData({ ...formData, descripcion: e.target.value })
            }
            className="border border-gray-400 rounded-lg px-4 py-2 w-full text-black mb-4"
            rows={3}
          />

          <div className="flex gap-3">
            <button
              onClick={handleAddIncident}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Guardar
            </button>

            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de incidentes */}
      <div className="max-w-4xl mx-auto">
        {incidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No hay reportes aún. ¡Crea uno para comenzar!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((inc, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold text-black text-lg">
                      {inc.tipo_incidente}
                    </h3>
                    <p className="text-gray-700">📍 {inc.ubicacion}</p>
                    <p className="text-gray-600 mt-1">{inc.descripcion}</p>

                    <p className="mt-1 text-sm text-blue-700 font-semibold">
                      Estado: {inc.estado || "pendiente"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
