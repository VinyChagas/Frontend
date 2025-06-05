import "../styles/Home.scss";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <motion.div
      className="home-container"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {/* Resumo */}
      <div className="summary-cards">
        <Card title="Empresas Processadas" value="24" updated="há 3 min" icon="🏢" />
        <Card title="Notas Emitidas" value="120" updated="há 3 min" icon="📄" />
        <Card title="Notas Recebidas" value="98" updated="há 3 min" icon="📥" />
        <Card title="DAM Emitidos" value="25" updated="há 3 min" icon="📊" />
      </div>

      {/* Stepper */}
      <div className="stepper">
        {steps.map((step, index) => (
          <div key={index} className={`step ${step.status}`}>
            <div className="icon">{step.icon}</div>
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="data-table">
        <div className="table-header">
          <span>Empresa</span>
          <span>CNPJ</span>
          <span>Etapa Atual</span>
          <span>Tempo Gasto</span>
          <span></span>
        </div>

        {companies.map((company, i) => (
          <div className="table-row" key={i}>
            <span>{company.nome}</span>
            <span>{company.cnpj}</span>
            <span className={`badge ${company.statusClass}`}>{company.etapa}</span>
            <span>{company.tempo}</span>
            <button className="btn-detalhes">Detalhes</button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Dados mockados (exemplos)
const steps = [
  { label: "Login e senha", icon: "✅", status: "done" },
  { label: "Selecionar CNPJ", icon: "🟡", status: "current" },
  { label: "Buscar NFS-e Emitidas", icon: "✅", status: "done" },
  { label: "Baixa sem movimento", icon: "❌", status: "error" },
  { label: "Buscar NFS-e Recebidas", icon: "⚪", status: "pending" },
  { label: "Emitir DAM", icon: "⚪", status: "pending" },
];

const companies = [
  {
    nome: "Exemplo S.A.",
    cnpj: "00.000.000/0001-01",
    etapa: "Selecionar CNPJ",
    tempo: "2 min",
    statusClass: "yellow",
  },
  {
    nome: "Empresa Teste Ltda",
    cnpj: "00.000.000/0002-02",
    etapa: "Falha sem movimento",
    tempo: "5 min",
    statusClass: "red",
  },
  {
    nome: "Demo Comércio ME",
    cnpj: "00.000.000/0003-03",
    etapa: "Buscar NFS-e Recebidas",
    tempo: "3 min",
    statusClass: "green",
  },
  {
    nome: "ABC Industrial LTDA",
    cnpj: "00.000.000/0004-04",
    etapa: "Emitir DAM",
    tempo: "4 min",
    statusClass: "gray",
  },
];

function Card({ title, value, updated, icon }: any) {
  return (
    <div className="card">
      <div className="icon">{icon}</div>
      <div className="info">
        <p className="title">{title}</p>
        <h2 className="value">{value}</h2>
        <p className="updated">atualizado {updated}</p>
      </div>
    </div>
  );
}