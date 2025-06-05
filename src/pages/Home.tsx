import { useRef, useState } from "react";
import "../styles/Home.scss";
import { motion } from "framer-motion";

const DROPDOWN_OPTIONS = [
  { label: "A partir", value: "apartir", placeholder: "Insira a linha inicial: 2" },
  { label: "Intervalo", value: "intervalo", placeholder: "Insira o intervalo: 20-35" },
  { label: "Selecionadas", value: "selecionadas", placeholder: "Insira as linhas: 3,8,9..." },
];

const DROPDOWN_AGENTS = [
  { label: "1", value: "1"},
  { label: "2", value: "2", },
  { label: "4", value: "4"},
  { label: "8", value: "8"},
];

const DROPDOWN_RESOLUCAO = [
  { label: "FHD", value: "fhd" },
  { label: "QHD", value: "qhd" },
];

const DROPDOWN_MODO = [
  { label: "Automático", value: "automatico" },
  { label: "Manual", value: "manual" },
];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMsg] = useState("Necessário selecionar o arquivo");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownValue, setDropdownValue] = useState(DROPDOWN_OPTIONS[0].value);
  const [inputValor, setInputValor] = useState("");
  const [agentesDropdownOpen, setAgentesDropdownOpen] = useState(false);
  const [agenteSelecionado, setAgenteSelecionado] = useState(DROPDOWN_AGENTS[0].value);
  const [resolucaoDropdownOpen, setResolucaoDropdownOpen] = useState(false);
  const [resolucaoSelecionada, setResolucaoSelecionada] = useState(DROPDOWN_RESOLUCAO[0].value);
  const [modoDropdownOpen, setModoDropdownOpen] = useState(false);
  const [modoSelecionado, setModoSelecionado] = useState(DROPDOWN_MODO[0].value);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoSelecionado(file);
    }
  };

  const selectedOption = DROPDOWN_OPTIONS.find(opt => opt.value === dropdownValue)!;

  return (
    <>
      {/* Modal de aviso */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>{modalMsg}</p>
            <button className="modal-btn" onClick={() => setShowModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}
      {/* Cabeçalho de navegação */}
      <header className="home-navbar">
        <nav>
          <ul>
            {/* Botão importar planilha */}
            <li className="navbar-importar-btn">
              <button
                className="navbar-btn importar-btn"
                onClick={handleImportClick}
                type="button"
              >
                Importar Planilha
              </button>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </li>
            {/* Separador visual antes do dropdown */}
            <li className="navbar-separator" aria-hidden="true"></li>
            {/* Dropdown */}
            <li className="navbar-dropdown-wrapper">
              <div
                className={`navbar-dropdown${dropdownOpen ? " open" : ""}${!arquivoSelecionado ? " navbar-disabled" : ""}`}
                tabIndex={0}
                onClick={() => arquivoSelecionado && setDropdownOpen(v => !v)}
                onBlur={() => setDropdownOpen(false)}
                style={!arquivoSelecionado ? { pointerEvents: "auto" } : {}}
              >
                <span>{selectedOption.label}</span>
                <span className="navbar-dropdown-arrow">▼</span>
                {dropdownOpen && (
                  <ul className="navbar-dropdown-list">
                    {DROPDOWN_OPTIONS.map(opt => (
                      <li
                        key={opt.value}
                        className={dropdownValue === opt.value ? "active" : ""}
                        onClick={e => {
                          e.stopPropagation();
                          setDropdownValue(opt.value);
                          setDropdownOpen(false);
                          setInputValor("");
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
            {/* Input relacionado ao dropdown */}
            <li className="navbar-dropdown-input">
              <input
                type="text"
                className="navbar-dropdown-textinput"
                placeholder={selectedOption.placeholder}
                value={inputValor}
                onChange={e => setInputValor(e.target.value)}
                disabled={!arquivoSelecionado}
                style={{ width: 180 }}
              />
            </li>
            {/* Separador visual */}
            <li className="navbar-separator" aria-hidden="true"></li>
            {/* Restante das opções */}
            {/* Dropdown Modo de Execução */}
            <li className="navbar-modo-dropdown-wrapper" style={{ position: "relative" }}>
              <div
                className={`navbar-modo-btn${modoDropdownOpen ? " open" : ""}${!arquivoSelecionado ? " navbar-disabled" : ""}`}
                tabIndex={0}
                onClick={() => arquivoSelecionado && setModoDropdownOpen(v => !v)}
                onBlur={() => setModoDropdownOpen(false)}
                style={!arquivoSelecionado ? { pointerEvents: "auto" } : {}}
              >
                <span>
                  {`Modo de Execução${modoSelecionado ? `: ${DROPDOWN_MODO.find(m => m.value === modoSelecionado)?.label}` : ""}`}
                </span>
                <span className="navbar-dropdown-arrow">▼</span>
                {modoDropdownOpen && (
                  <ul
                    className="navbar-dropdown-list"
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      minWidth: "120px",
                      zIndex: 20,
                      padding: "0.02rem 0"
                    }}
                  >
                    {DROPDOWN_MODO.map(opt => (
                      <li
                        key={opt.value}
                        className={modoSelecionado === opt.value ? "active" : ""}
                        onClick={e => {
                          e.stopPropagation();
                          setModoSelecionado(opt.value);
                          setModoDropdownOpen(false);
                        }}
                        style={{ padding: "0.22rem 0.8rem" }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
            {/* Separador visual */}
            <li className="navbar-separator" aria-hidden="true"></li>
            {/* Dropdown Agents */}
            <li className="navbar-agentes-dropdown-wrapper" style={{ position: "relative" }}>
              <div
                className={`navbar-agentes-btn${agentesDropdownOpen ? " open" : ""}${!arquivoSelecionado ? " navbar-disabled" : ""}`}
                tabIndex={0}
                onClick={() => arquivoSelecionado && setAgentesDropdownOpen(v => !v)}
                onBlur={() => setAgentesDropdownOpen(false)}
                style={!arquivoSelecionado ? { pointerEvents: "auto" } : {}}
              >
                <span>{`Agentes${agenteSelecionado ? `: ${agenteSelecionado}` : ""}`}</span>
                <span className="navbar-dropdown-arrow">▼</span>
                {agentesDropdownOpen && (
                  <ul
                    className="navbar-dropdown-list"
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      minWidth: "120px",
                      zIndex: 20,
                      padding: "0.02rem 0"
                    }}
                  >
                    {DROPDOWN_AGENTS.map(opt => (
                      <li
                        key={opt.value}
                        className={agenteSelecionado === opt.value ? "active" : ""}
                        onClick={e => {
                          e.stopPropagation();
                          setAgenteSelecionado(opt.value);
                          setAgentesDropdownOpen(false);
                        }}
                        style={{ padding: "0.22rem 0.8rem" }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
            {/* Separador visual */}
            <li className="navbar-separator" aria-hidden="true"></li>
            {/* Dropdown Resolução */}
            <li className="navbar-resolucao-dropdown-wrapper" style={{ position: "relative" }}>
              <div
                className={`navbar-resolucao-btn${resolucaoDropdownOpen ? " open" : ""}${!arquivoSelecionado ? " navbar-disabled" : ""}`}
                tabIndex={0}
                onClick={() => arquivoSelecionado && setResolucaoDropdownOpen(v => !v)}
                onBlur={() => setResolucaoDropdownOpen(false)}
                style={!arquivoSelecionado ? { pointerEvents: "auto" } : {}}
              >
                <span>{`Resolução${resolucaoSelecionada ? `: ${DROPDOWN_RESOLUCAO.find(r => r.value === resolucaoSelecionada)?.label}` : ""}`}</span>
                <span className="navbar-dropdown-arrow">▼</span>
                {resolucaoDropdownOpen && (
                  <ul
                    className="navbar-dropdown-list"
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      minWidth: "120px",
                      zIndex: 20,
                      padding: "0.02rem 0"
                    }}
                  >
                    {DROPDOWN_RESOLUCAO.map(opt => (
                      <li
                        key={opt.value}
                        className={resolucaoSelecionada === opt.value ? "active" : ""}
                        onClick={e => {
                          e.stopPropagation();
                          setResolucaoSelecionada(opt.value);
                          setResolucaoDropdownOpen(false);
                        }}
                        style={{ padding: "0.22rem 0.8rem" }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
            {/* Segunda separação visual */}
            <li className="navbar-separator" aria-hidden="true"></li>
          </ul>
          <div className="navbar-right">
            <button
              className="navbar-btn iniciar-btn"
              disabled={!arquivoSelecionado}
              style={!arquivoSelecionado ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              Iniciar
            </button>
          </div>
        </nav>
      </header>
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
    </>
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