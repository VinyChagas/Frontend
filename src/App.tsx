import { useState } from "react";
import Login from "./pages/Login";

function App() {
  const [autenticado, setAutenticado] = useState(false);

  return autenticado ? (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold text-gray-800">Bem-vindo 🎉</h1>
    </div>
  ) : (
    <Login onLogin={() => setAutenticado(true)} />
  );
}

export default App;