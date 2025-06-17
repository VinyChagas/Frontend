import "../styles/Validador.scss";
import { useState } from "react";

export default function Validador() {
  // Mock de dados da empresa
  const empresa = {
    nome: "SCS Contabilidade",
    cnpj: "12.345.678/0001-99",
    clientes: 42,
  };

  // Mock de linhas da planilha
  const [linhas] = useState([
    {
      linha: 1,
      empresa: "SCS Contabilidade",
      cnpj: "00.000.000/000-22",
      usuario: "SCSCONTA",
      senha: "*******",
      status: "captcha", // "captcha", "loading", "ok", "erro"
      captcha: "12678",
      captchaImg: "https://dummyimage.com/70x30/eee/222&text=12678",
    },
    {
      linha: 1,
      empresa: "SCS Contabilidade",
      cnpj: "00.000.000/000-22",
      usuario: "SCSCONTA",
      senha: "*******",
      status: "loading",
    },
    {
      linha: 1,
      empresa: "SCS Contabilidade",
      cnpj: "00.000.000/000-22",
      usuario: "SCSCONTA",
      senha: "*******",
      status: "ok",
    },
    {
      linha: 1,
      empresa: "SCS Contabilidade",
      cnpj: "00.000.000/000-22",
      usuario: "SCSCONTA",
      senha: "*******",
      status: "erro",
    },
  ]);

  function handleImportarClick() {
    document.getElementById("input-planilha")?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Aqui você pode tratar o arquivo selecionado
      alert(`Arquivo selecionado: ${file.name}`);
      // Aqui você pode simular o setLinhas com dados vindos da planilha
    }
    e.target.value = "";
  }

  return (
    <div className="validador-container">
      <div className="validador-top-row" style={{ alignItems: "center", position: "relative" }}>
        <div className="validador-header-info">
          <h1 className="validador-titulo">{empresa.nome}</h1>
          <div className="validador-empresa-dados">
            <span><strong>CNPJ:</strong> {empresa.cnpj}</span>
            <span><strong>Clientes:</strong> {empresa.clientes}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", height: "auto" }}>
          <input
            id="input-planilha"
            type="file"
            accept=".xlsx,.xls,.ods,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet,text/csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="validador-importar-btn"
            type="button"
            onClick={handleImportarClick}
            style={{ margin: 0, alignSelf: "center" }}
          >
            Importar Planilha
          </button>
        </div>
      </div>

      {/* Tabela estilizada conforme o print */}
      <div className="validador-tabela-wrapper">
        <table className="validador-tabela">
          <thead>
            <tr>
              <th>Linha</th>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Usuário</th>
              <th>Senha</th>
              <th style={{ minWidth: 120 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, idx) => (
              <tr key={idx} className={`validador-tabela-row validador-status-${linha.status}`}>
                <td>
                  <div className="validador-tabela-circulo">{linha.linha}</div>
                </td>
                <td className="validador-tabela-empresa">{linha.empresa}</td>
                <td className="validador-tabela-cnpj">{linha.cnpj}</td>
                <td className="validador-tabela-usuario">{linha.usuario}</td>
                <td className="validador-tabela-senha">{linha.senha}</td>
                <td className="validador-tabela-status">
                  {linha.status === "captcha" && (
                    <div className="validador-tabela-status-captcha">
                      <img src={linha.captchaImg} alt="captcha" className="validador-tabela-captcha-img" />
                      <span className="validador-tabela-captcha-text">{linha.captcha}</span>
                    </div>
                  )}
                  {linha.status === "loading" && (
                    <div className="validador-tabela-status-loading">
                      <span className="validador-tabela-loading-spinner" />
                    </div>
                  )}
                  {linha.status === "ok" && (
                    <div className="validador-tabela-status-ok">
                      <span className="validador-tabela-ok-icon">&#10003;</span>
                    </div>
                  )}
                  {linha.status === "erro" && (
                    <div className="validador-tabela-status-erro">
                      <span className="validador-tabela-erro-icon">&#10007;</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
