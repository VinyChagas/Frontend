import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");

  const senhaCorreta = "admin123";

  const handleLogin = () => {
    if (senha === senhaCorreta) {
      onLogin();
    } else {
      setErro("Senha incorreta");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-800 via-blue-900 to-indigo-900">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl p-10 rounded-2xl w-full max-w-sm space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-blue-600 text-white p-3 rounded-full shadow">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 text-sm">Digite a senha do administrador para continuar</p>
        </div>

        {/* Campo de senha */}
        <div className="relative">
          <input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Senha"
            className={`w-full py-2 pl-4 pr-10 border rounded-lg shadow-sm bg-white/80 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
              erro ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-blue-500"
            }`}
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErro("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <motion.p
            className="text-sm text-red-600 font-medium text-center"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {erro}
          </motion.p>
        )}

        {/* Botão */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogin}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow hover:from-blue-700 hover:to-cyan-700 transition"
        >
          Entrar
        </motion.button>
      </motion.div>
    </div>
  );
}