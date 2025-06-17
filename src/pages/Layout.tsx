import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { User, House, FileText, Users, PiggyBank, LogOut, KeyRound, ChevronDown, Eye, CheckCircle } from "lucide-react";
import "../styles/Home.scss";
import "../styles/Layout.scss"; // Adicione um novo arquivo para estilos do layout

const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: <House size={20} />, route: "/home" },
  { label: "Contabilidades", icon: <Users size={20} />, route: "/contabilidades" },
  { label: "Relatórios", icon: <FileText size={20} />, route: "/relatorios" },
  { label: "C. Custo", icon: <PiggyBank size={20} />, route: "/centro-custo" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaNovaRep, setSenhaNovaRep] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showSenhaRep, setShowSenhaRep] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false); // novo estado para senha atual
  const [showLoading, setShowLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState<null | string>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const senhaNovaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const userName = "Administrador";

  // LGPD: 8-12 caracteres, pelo menos 1 maiúscula, 1 minúscula, 1 número, 1 especial
  function validarSenhaLGPD(s: string) {
    const min = 8;
    const max = 12;
    const temMin = s.length >= min;
    const temMax = s.length <= max;
    const temMaiuscula = /[A-Z]/.test(s);
    const temMinuscula = /[a-z]/.test(s);
    const temNumero = /\d/.test(s);
    const temEspecial = /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?`~]/.test(s);
    return temMin && temMax && temMaiuscula && temMinuscula && temNumero && temEspecial;
  }

  function senhaFeedback(s: string): string {
    const min = 8;
    const max = 12;
    if (s.length < 6) return ""; // só mostra feedback a partir de 6 caracteres
    const faltando: string[] = [];
    if (s.length < min) faltando.push("mínimo 8 caracteres");
    if (s.length > max) faltando.push("máximo 12 caracteres");
    if (!/[A-Z]/.test(s)) faltando.push("letra maiúscula");
    if (!/[a-z]/.test(s)) faltando.push("letra minúscula");
    if (!/\d/.test(s)) faltando.push("número");
    if (!/[!@#$%^&*()_\-+=\[\]{};':\"\\|,.<>/?`~]/.test(s)) faltando.push("caractere especial");
    return faltando.length > 0 ? "Faltando: " + faltando.join(", ") : "";
  }

  function senhaRepFeedback(s1: string, s2: string): string {
    const min = 8;
    const max = 12;
    const faltando: string[] = [];
    if (s2.length < min) faltando.push("mínimo 8 caracteres");
    if (s2.length > max) faltando.push("máximo 12 caracteres");
    if (!/[A-Z]/.test(s2)) faltando.push("letra maiúscula");
    if (!/[a-z]/.test(s2)) faltando.push("letra minúscula");
    if (!/\d/.test(s2)) faltando.push("número");
    if (!/[!@#$%^&*()_\-+=\[\]{};':\"\\|,.<>/?`~]/.test(s2)) faltando.push("caractere especial");
    if (faltando.length > 0) return "Faltando: " + faltando.join(", ");
    if (s1 !== s2) return "As senhas devem ser iguais";
    return "";
  }

  function handleAlterarSenha() {
    setErroSenha("");
    if (!senhaAtual) {
      setErroSenha("Digite a senha atual.");
      return;
    }
    if (!validarSenhaLGPD(senhaNova)) {
      setErroSenha("A senha nova deve ter 8-12 caracteres, incluir maiúscula, minúscula, número e caractere especial.");
      return;
    }
    if (senhaNova !== senhaNovaRep) {
      setErroSenha("A confirmação da nova senha não confere.");
      return;
    }
    // Aqui você faria a chamada para alterar a senha no backend
    setShowLoading(true);
    setShowSuccess("Senha alterada com sucesso!");
    setTimeout(() => {
      setShowLoading(false);
      setShowSuccess(null);
      setShowSenhaModal(false);
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaNovaRep("");
      setErroSenha("");
    }, 2500);
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-top" />
        <nav className="sidebar-menu">
          <div className="sidebar-section">
            <span className="sidebar-section-title"></span>
            <ul>
              {SIDEBAR_ITEMS.map((item) => (
                <li
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  className={location.pathname === item.route ? "active" : ""}
                  style={{ cursor: "pointer" }}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span className="sidebar-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
      <div className="main">
        <header className="header">
          <div className="header-left" />
          <div className="header-actions profile-menu-wrapper">
            <button
              className="header-btn profile-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menu do usuário"
            >
              <User size={22} />
              <span className="profile-menu-username">{userName}</span>
              <ChevronDown
                size={18}
                className={menuOpen ? "profile-menu-chevron open" : "profile-menu-chevron"}
              />
            </button>
            {menuOpen && (
              <div ref={menuRef} className="profile-dropdown">
                <div className="profile-dropdown-user">
                  <User size={18} /> {userName}
                </div>
                <div
                  className="profile-dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowSenhaModal(true);
                    setTimeout(() => senhaNovaInputRef.current?.focus(), 200);
                  }}
                >
                  <KeyRound size={18} /> Alterar Senha
                </div>
                <div className="profile-dropdown-divider" />
                <div
                  className="profile-dropdown-item logout"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/login");
                  }}
                >
                  <LogOut size={18} /> Logout
                </div>
              </div>
            )}
          </div>
        </header>
        {/* Modal de alteração de senha */}
        {showSenhaModal && (
          <div className="senha-modal-bg">
            <div className="senha-modal">
              <span className="senha-modal-title">Alterar Senha</span>
              <form
                className="senha-modal-form"
                onSubmit={e => { e.preventDefault(); handleAlterarSenha(); }}
                autoComplete="off"
              >
                <label className="senha-modal-label">
                  Senha atual:
                  <div className="senha-modal-input-wrapper">
                    <input
                      type={showSenhaAtual ? "text" : "password"}
                      placeholder="Senha atual"
                      value={senhaAtual}
                      onChange={e => setSenhaAtual(e.target.value)}
                      className="senha-modal-input"
                      autoFocus
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="senha-modal-eye-btn"
                      onClick={() => setShowSenhaAtual((v) => !v)}
                      aria-label={showSenhaAtual ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showSenhaAtual
                        ? <Eye size={18} style={{ opacity: 0.4, transform: "scaleX(-1)" }} />
                        : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                <label className="senha-modal-label">
                  Nova senha:
                  <div className="senha-modal-input-wrapper">
                    <input
                      type={showSenha ? "text" : "password"}
                      placeholder="Nova senha"
                      value={senhaNova}
                      ref={senhaNovaInputRef}
                      onChange={e => {
                        setSenhaNova(e.target.value);
                        setErroSenha("");
                      }}
                      className="senha-modal-input"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="senha-modal-eye-btn"
                      onClick={() => setShowSenha((v) => !v)}
                      aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showSenha
                        ? <Eye size={18} style={{ opacity: 0.4, transform: "scaleX(-1)" }} />
                        : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                <label className="senha-modal-label">
                  Repetir nova senha:
                  <div className="senha-modal-input-wrapper">
                    <input
                      type={showSenhaRep ? "text" : "password"}
                      placeholder="Repetir nova senha"
                      value={senhaNovaRep}
                      onChange={e => {
                        setSenhaNovaRep(e.target.value);
                        setErroSenha("");
                      }}
                      className="senha-modal-input"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="senha-modal-eye-btn"
                      onClick={() => setShowSenhaRep((v) => !v)}
                      aria-label={showSenhaRep ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showSenhaRep
                        ? <Eye size={18} style={{ opacity: 0.4, transform: "scaleX(-1)" }} />
                        : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                {senhaNova.length >= 6 && senhaFeedback(senhaNova) && (
                  <span className="senha-modal-error">
                    {senhaFeedback(senhaNova)}
                  </span>
                )}
                {senhaNovaRep.length >= 6 && senhaRepFeedback(senhaNova, senhaNovaRep) && (
                  <span className="senha-modal-error">
                    {senhaRepFeedback(senhaNova, senhaNovaRep)}
                  </span>
                )}
                {erroSenha && (
                  <span className="senha-modal-error">
                    {erroSenha}
                  </span>
                )}
                <div className="senha-modal-actions">
                  <button
                    type="submit"
                    className="senha-modal-btn salvar"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    className="senha-modal-btn cancelar"
                    onClick={() => {
                      setShowSenhaModal(false);
                      setSenhaAtual("");
                      setSenhaNova("");
                      setSenhaNovaRep("");
                      setErroSenha("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {showSuccess && (
          <div className="contabilidade-success-card">
            <div className="contabilidade-success-inner">
              <CheckCircle size={28} style={{ flexShrink: 0 }} />
              <span>{showSuccess}</span>
            </div>
            <style>
              {`
                @keyframes slideUpDown {
                  0% {
                    opacity: 0;
                    transform: translateY(40px);
                  }
                  10% {
                    opacity: 1;
                    transform: translateY(0);
                  }
                  90% {
                    opacity: 1;
                    transform: translateY(0);
                  }
                  100% {
                    opacity: 0;
                    transform: translateY(40px);
                  }
                }
                @keyframes spin {
                  0% { transform: rotate(0deg);}
                  100% { transform: rotate(360deg);}
                }
              `}
            </style>
          </div>
        )}
        {showLoading && (
          <div className="contabilidade-loading-bg">
            <div className="contabilidade-loading-modal">
              <div className="contabilidade-loading-spinner" />
              <span className="contabilidade-loading-text">Carregando...</span>
            </div>
          </div>
        )}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
