import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.scss";
import axios from "axios";

// Tipo da empresa
type Empresa = {
  id: number;
  nome: string;
  clientes: number;
};

export default function Home() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:4000/api/empresas")
      .then((res) => setEmpresas(res.data as Empresa[]))
      .catch(() => setEmpresas([]));
  }, []);

  return (
    <div className="home-cards-container">
      {empresas.map((empresa) => (
        <button
          className="home-card"
          key={empresa.id}
          onClick={() => navigate("/validador")}
        >
          <div className="home-card-header">
            <div className="home-card-logo home-card-logo--initials">
              {empresa.nome.trim().charAt(0).toUpperCase()}
            </div>
            <div className="home-card-title-group">
              <span className="home-card-subtitle">Empresa</span>
              <span className="home-card-title">{empresa.nome}</span>
            </div>
          </div>
          <div className="home-card-divider" />
          <div className="home-card-indicators">
            <div className="home-card-indicator">
              <span className="home-card-indicator-label">Clientes</span>
              <div className="home-card-indicator-value home-card-indicator-value--wide">
                {empresa.clientes}
              </div>
            </div>
            <div className="home-card-indicator">
              <span className="home-card-indicator-label">Erros</span>
              <div className="home-card-indicator-value home-card-indicator-value--wide">
                0
              </div>
            </div>
            <div className="home-card-indicator">
              <span className="home-card-indicator-label">Status</span>
              <div className="home-card-indicator-status home-card-indicator-status--wide">
                Ativo
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
