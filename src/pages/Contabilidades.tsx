import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Contabilidades.scss";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  clientes: number;
  logoUrl?: string;
};

// Função utilitária para formatar CNPJ na listagem
function formatCNPJ(cnpj: string) {
  const digits = cnpj.replace(/\D/g, "").slice(0, 14);
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export default function Contabilidades() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  // 🔁 Atualiza empresas ao carregar
  useEffect(() => {
    axios.get("http://localhost:4000/empresas")
      .then(res => setEmpresas(res.data))
      .catch(err => {
        console.error("Erro ao buscar empresas", err);
        setEmpresas([]);
      });
  }, []);

  // 🔍 Filtro de busca
  const termo = busca.trim().toLowerCase();
  const empresasFiltradas = empresas.filter((e) => {
    if (!termo) return true;
    const textoBusca = `${e.nome} ${e.cnpj}`.toLowerCase();
    const textoBuscaSemAcento = textoBusca.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const termoSemAcento = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
              <div className="contabilidades-cnpj">
                {formatCNPJ(empresa.cnpj)}
              </div>
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
