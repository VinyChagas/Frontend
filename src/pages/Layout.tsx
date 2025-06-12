import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { User, House, FileText, FileSearch, Users, PiggyBank, LogOut, KeyRound, ChevronDown, Eye } from "lucide-react";
import "../styles/Home.scss";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: <House size={20} />, route: "/home" },
  { label: "Validador", icon: <FileSearch size={20} />, route: "/validador" },
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
    if (s1.length < 6 || s2.length < 6) return "";
    if (s1 !== s2) return "As senhas não conferem";
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
    setShowSenhaModal(false);
    setSenhaAtual("");
    setSenhaNova("");
    setSenhaNovaRep("");
    setErroSenha("");
    alert("Senha alterada com sucesso!");
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
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(30,41,59,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
            }}
          >
            <div
              style={{
                background: "#fff",
                color: "#222",
                padding: "2.2rem 2.5rem",
                borderRadius: "18px",
                boxShadow: "0 8px 32px rgba(30,41,59,0.18)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.1rem",
                minWidth: "320px",
                fontSize: "1.08rem",
                fontWeight: 500,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "1.18rem" }}>Alterar Senha</span>
              <input
                type="password"
                placeholder="Senha atual"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  background: "#f6f7fa",
                  fontSize: "1.08rem",
                  marginBottom: "0.2rem"
                }}
                autoFocus
              />
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type={showSenha ? "text" : "password"}
                  placeholder="Nova senha"
                  value={senhaNova}
                  ref={senhaNovaInputRef}
                  onChange={e => {
                    setSenhaNova(e.target.value);
                    setErroSenha("");
                  }}
                  style={{
                    width: "100%",
                    padding: "0.8rem 1rem",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    background: "#f6f7fa",
                    fontSize: "1.08rem",
                    marginBottom: "0.2rem"
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: "1.2rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    padding: 0,
                    display: "flex",
                    alignItems: "center"
                  }}
                  onClick={() => setShowSenha((v) => !v)}
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showSenha
                    ? <Eye size={20} style={{ opacity: 0.4, transform: "scaleX(-1)" }} />
                    : <Eye size={20} />}
                </button>
              </div>
              {senhaNova.length >= 6 && senhaFeedback(senhaNova) && (
                <span style={{ color: "#ef4444", fontSize: "0.97rem", fontWeight: 600 }}>
                  {senhaFeedback(senhaNova)}
                </span>
              )}
              <input
                type="password"
                placeholder="Repetir nova senha"
                value={senhaNovaRep}
                onChange={e => {
                  setSenhaNovaRep(e.target.value);
                  setErroSenha("");
                }}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  background: "#f6f7fa",
                  fontSize: "1.08rem",
                  marginBottom: "0.2rem"
                }}
              />
              {senhaNova.length >= 6 && senhaNovaRep.length >= 6 && senhaRepFeedback(senhaNova, senhaNovaRep) && (
                <span style={{ color: "#ef4444", fontSize: "0.97rem", fontWeight: 600 }}>
                  {senhaRepFeedback(senhaNova, senhaNovaRep)}
                </span>
              )}
              {erroSenha && (
                <span style={{ color: "#ef4444", fontSize: "0.97rem", fontWeight: 600 }}>
                  {erroSenha}
                </span>
              )}
              <div style={{ display: "flex", gap: "1.1rem", marginTop: "0.7rem" }}>
                <button
                  type="button"
                  style={{
                    background: "linear-gradient(90deg, #2563eb 60%, #38bdf8 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "1.01rem",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.6rem 1.2rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(56,189,248,0.13)",
                    minWidth: "110px"
                  }}
                  onClick={handleAlterarSenha}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  style={{
                    background: "#e5e7eb",
                    color: "#222",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 700,
                    fontSize: "1.01rem",
                    cursor: "pointer",
                    minWidth: "110px"
                  }}
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
