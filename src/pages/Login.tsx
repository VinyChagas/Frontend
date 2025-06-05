import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeSlash } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.scss";


const Login: React.FC = () => {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const senhaCorreta = "admin123@";

  const handleLogin = () => {
    if (senha === "") {
      setErro("A senha não pode estar vazia.");
    } else if (senha !== senhaCorreta) {
      setErro("Senha incorreta.");
    } else {
      setErro("");
      navigate("/home");
    }
  };

  return (
    <motion.div
      className="login-root"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="login-container"
      >
        {/* Header */}
        <div className="login-header">
          <motion.div
            className="login-icon"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 320, damping: 18 }}
          >
            <Lock size={28} weight="bold" />
          </motion.div>
          <motion.h2
            className="login-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
          >
            Acesso Restrito
          </motion.h2>
          <motion.p
            className="login-subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.45 }}
          >
            Digite a senha do administrador
          </motion.p>
        </div>

        {/* Campo de senha */}
        <motion.div
          className="login-input-wrapper"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Digite sua senha"
            className={`login-input${erro ? " login-input-error" : ""}`}
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
            className="login-eye-btn"
            tabIndex={-1}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </motion.div>

        {/* Mensagem de erro */}
        {erro && (
          <motion.p
            className="login-error"
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
          className="login-btn"
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          Entrar
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default Login;
