import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { User, House, FileText, FileSearch, Users, PiggyBank, LogOut, KeyRound, Image as ImageIcon, ChevronDown } from "lucide-react";
import "../styles/Home.scss";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: <House size={20} />, route: "/dashboard" },
  { label: "Validador", icon: <FileSearch size={20} />, route: "/validador" },
  { label: "Contabilidades", icon: <Users size={20} />, route: "/contabilidades" },
  { label: "Relatórios", icon: <FileText size={20} />, route: "/relatorios" },
  { label: "C. Custo", icon: <PiggyBank size={20} />, route: "/centro-custo" },
];

export default function Layout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
                  onClick={() => { /* lógica para alterar foto */ setMenuOpen(false); }}
                >
                  <ImageIcon size={18} /> Alterar Foto do Perfil
                </div>
                <div
                  className="profile-dropdown-item"
                  onClick={() => { /* lógica para alterar senha */ setMenuOpen(false); }}
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
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
