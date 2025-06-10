import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Contabilidades.scss";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  clientes: number;
  logoUrl?: string;
};

const empresasMock: Empresa[] = [
  {
    id: 1,
    nome: "SCS Contabilidade",
    cnpj: "12.345.678/0001-90",
    clientes: 18,
    logoUrl: "",
  },
  {
    id: 2,
    nome: "ABC Consultoria",
    cnpj: "98.765.432/0001-10",
    clientes: 7,
    logoUrl: "",
  },
  {
    id: 3,
    nome: "XYZ Financeiro",
    cnpj: "11.222.333/0001-44",
    clientes: 3,
    logoUrl: "",
  },
];

export default function Contabilidades() {
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  const termo = busca.trim().toLowerCase();
  const empresasFiltradas = empresasMock.filter((e) => {
    if (!termo) return true;
    const textoBusca = `${e.nome} ${e.cnpj}`.toLowerCase();
    const textoBuscaSemAcento = textoBusca
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const termoSemAcento = termo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return textoBuscaSemAcento.includes(termoSemAcento);
  });

  return (
    <div className="contabilidades-page">
      <div className="contabilidades-header">
        <input
          className="contabilidades-search"
          type="text"
          placeholder="Pesquisar empresa ou CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          className="contabilidades-novo-btn"
          onClick={() => navigate("/contabilidades/novo")}
        >
          Novo Cadastro
        </button>
      </div>
      <div className="contabilidades-list">
        {empresasFiltradas.length === 0 && (
          <div className="contabilidades-empty">Nenhuma empresa encontrada.</div>
        )}
        {empresasFiltradas.map((empresa) => (
          <div className="contabilidades-item" key={empresa.id}>
            <div className="contabilidades-logo">
              {empresa.logoUrl ? (
                <img src={empresa.logoUrl} alt={empresa.nome} />
              ) : (
                <div className="contabilidades-logo-placeholder">
                  {empresa.nome[0]}
                </div>
              )}
            </div>
            <div className="contabilidades-info">
              <div className="contabilidades-nome">{empresa.nome}</div>
              <div className="contabilidades-cnpj">{empresa.cnpj}</div>
            </div>
            <div className="contabilidades-clientes">
              <span>{empresa.clientes}</span>
              <span>clientes</span>
            </div>
            <button
              className="contabilidades-editar-btn"
              onClick={() => navigate(`/contabilidades/${empresa.id}`)}
            >
              Editar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
