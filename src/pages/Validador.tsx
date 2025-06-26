import "../styles/Validador.scss";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
import { CheckCircle } from "@phosphor-icons/react";
import {XCircle, Loader2 } from "lucide-react";

const socket = io("http://localhost:4000");

export default function Validador() {
  const [empresa,           setEmpresa]           = useState({ nome: "", cnpj: "", clientes: 0 });
  const [linhasAtivas,      setLinhasAtivas]      = useState<any[]>([]);
  const [linhasComErro,     setLinhasComErro]     = useState<any[]>([]);
  const [respostaCaptcha,   setRespostaCaptcha]   = useState<Record<number,string>>({});
  const [filaExecucao, setFilaExecucao] = useState<any[]>([]);
  const [planilhaImportada, setPlanilhaImportada] = useState(false);
  const [captchaImgBase64, setCaptchaImgBase64] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const filaExecucaoRef = useRef<any[]>([]);
  useEffect(() => { filaExecucaoRef.current = filaExecucao; }, [filaExecucao]);


// Consolidado: único useEffect para socket.on("progresso")
useEffect(() => {
  function handleProgresso(info: any) {
    const { linha, status } = info;
    setLinhasAtivas((prevAtivas) => {
      let atualizadas = prevAtivas.map((l) =>
        l.linha === linha
          ? {
              ...l,
              status,
              captchaImg: info.captchaBase64 || l.captchaImg,
            }
          : l
      );

      if (status.toLowerCase().includes("sucesso")) {
        // Move para o final da lista
        const linhaSucesso = atualizadas.find((l) => l.linha === linha);
        const semLinha = atualizadas.filter((l) => l.linha !== linha);
        return [...semLinha, linhaSucesso];
      }
      if (status.toLowerCase().includes("erro")) {
        // Remove da lista de ativas
        return atualizadas.filter((l) => l.linha !== linha);
      }
      return atualizadas;
    });
    // Se for erro, adiciona em linhasComErro
    if (status.toLowerCase().includes("erro")) {
      setLinhasComErro((erroAntigo) => {
        const jaExiste = erroAntigo.some((l) => l.linha === linha);
        if (jaExiste) return erroAntigo;
        return [...erroAntigo, { ...info }];
      });
    }
  }
  socket.on("progresso", handleProgresso);
  return () => {
    socket.off("progresso", handleProgresso);
  };
}, []);


useEffect(() => {
  fetch("http://localhost:4000/api/empresas")
    .then((res) => res.json())
    .then((data) => {
      if (data.length > 0) {
        setEmpresa(data[0]);

        // Carrega JSON da contabilidade
        const nomeContabilidade = data[0].nome;
        const nomeArquivoSeguro = nomeContabilidade.replace(/[^\w\d]/g, '_');
        fetch(`http://localhost:4000/api/validacoes/${encodeURIComponent(nomeArquivoSeguro)}`)
          .then(res => res.json())
          .then(dados => {
            if (Array.isArray(dados)) {
              setLinhasAtivas(dados);
            } else {
              console.warn('Nenhum dado encontrado para esta contabilidade.');
            }
          })
          .catch(err => console.error('Erro ao carregar JSON da contabilidade:', err));
      }
      });
  }, []);



useEffect(() => {
  async function carregarValidacoes() {
    try {
      const nomeTratado = empresa.nome.replace(/[^\w\d]/g, '_');
      const res = await fetch(`http://localhost:4000/empresas/validacoes/${nomeTratado}`);
      if (!res.ok) {
        console.warn('Nenhum dado de validação encontrado.');
        return;
      }

      const validacoesSalvas = await res.json();
      setLinhasAtivas((prev) =>
        prev.map((linha) => {
          const validada = validacoesSalvas.find((v: any) => v.linha === linha.linha);
          return validada ? { ...linha, status: validada.status || linha.status } : linha;
        })
      );
    } catch (err) {
      console.error('Erro ao carregar validações:', err);
    }
  }

  if (empresa?.nome) {
    carregarValidacoes();
  }
}, [empresa]);
  function handleImportarClick() {
    document.getElementById("input-planilha")?.click();
  }

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Processa localmente para exibir imediatamente
      const linhasProcessadas = rows.map((row: any, index: number) => ({
        linha: index + 2,
        procurador: row["Procurador"]?.toUpperCase() || "",
        presumido: row["Presumido"]?.toUpperCase() || "",
        empresa: row["empresa"] || "",
        CNPJ: row["CNPJ"] || "",
        usuario: row["usuario"] || "",
        senha: row["senha"] || "",
        status: "",
        captchaImg: "",
      }));
      setLinhasAtivas(linhasProcessadas);
      setPlanilhaImportada(true);

      // Se quiser já enviar para o backend, descomente a linha abaixo:
      // handleUpload(file);
    };
    reader.readAsArrayBuffer(file);
  }
  e.target.value = "";
}

const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append("planilha", file);
  formData.append("contabilidade", empresa.nome); // Envia o nome da contabilidade

  try {
    const res = await fetch("http://localhost:4000/api/upload-planilha", {
      method: "POST",
      body: formData,
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      const linhasProcessadas = resultado.dados.map((row: any, index: number) => ({
        linha: row.linha || index + 2,
        procurador: row.procurador?.toUpperCase() || row["procurador"]?.toUpperCase() || "",
        presumido: row.presumido?.toUpperCase() || row["presumido"]?.toUpperCase() || "",
        empresa: row.empresa || "",
        CNPJ: row.CNPJ || "",
        usuario: row.usuario || "",
        senha: row.senha || "",
        responsavel: row.responsavel || "",
        codSistema: row.codSistema || "",
        mes: row.mes || "",
        ano: row.ano || "",
        IM: row.IM || "",
        status: "",
        captchaImg: "",
      }));
      setLinhasAtivas(linhasProcessadas);
      setPlanilhaImportada(true);
    } else {
      console.error("Erro ao processar no backend:", resultado.erro);
    }

  } catch (error) {
    console.error("Erro ao enviar planilha:", error);
  }
};

function enviarCaptcha(linha: number) {
  const codigo = respostaCaptcha[linha];
  fetch("http://localhost:4000/api/resolver-captcha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linha, codigo }),
  });
}

  const executarValidacao = async () => {
  try {
    const res = await fetch("http://localhost:4000/api/executar-validacao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
      contabilidade: empresa.nome,
      modoLogin,
      modoResolucao: resolucao,
      qtdNavegadores,
      }),
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      alert("✅ Validação concluida com sucesso!");
    } else {
      alert("❌ Erro ao iniciar validação: " + resultado.erro);
    }
  } catch (error) {
    console.error("Erro ao executar validação:", error);
    alert("Erro ao executar validação.");
  }
};

  const salvarNoBackend = async () => {
  try {
      const res = await fetch('http://localhost:4000/api/salvar-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contabilidade: empresa.nome,
        dados: linhasAtivas,
      }),
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      alert('✅ JSON salvo com sucesso no backend!');
    } else {
      alert('Erro ao salvar JSON: ' + resultado.erro);
    }
  } catch (err) {
    console.error('Erro ao salvar JSON no backend:', err);
    alert('Erro ao salvar JSON no backend.');
  }
};

function renderTabela(linhas: any[]) {
  return (
    <table className="validador-tabela">
      <thead>
        <tr>
          <th>Linha</th>
          <th>Procurador</th>
          <th>Presumido</th>
          <th>Empresa</th>
          <th>CNPJ</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr
            key={linha.linha}
            className={`validador-tabela-row ${
              linha.status?.toLowerCase().includes("sucesso")
                ? "status-sucesso"
                : linha.status?.toLowerCase().includes("erro")
                ? "status-erro"
                : linha.status === "carregando"
                ? "status-carregando"
                : ""
            }`}
          >
            <td>
              <div className="validador-tabela-circulo">{linha.linha}</div>
            </td>
            <td>
              <span className={`icone-status ${linha.procurador === 'SIM' ? 'verde' : 'cinza'}`}>
                {linha.procurador === 'SIM' ? '✔' : ''}
              </span>
            </td>
            <td>
              <span className={`icone-status ${linha.presumido === 'SIM' ? 'verde' : 'cinza'}`}>
                {linha.presumido === 'SIM' ? '✔' : ''}
              </span>
            </td>
            <td>{linha.empresa?.toString().slice(0, 23)}</td>
            <td>{linha.CNPJ}</td>
            {/* Overlay de status animado à direita */}
            <td style={{ position: 'relative', paddingRight: '100px' }}>
              {/* Fundo animado de status, atrás do ícone */}
              {(linha.status?.toLowerCase().includes("sucesso") ||
                linha.status?.toLowerCase().includes("erro") ||
                linha.status === "carregando") && (
                <span className="validador-status-bg"></span>
              )}
              {/* Ícone de status sobreposto */}
              {linha.status?.toLowerCase().includes("sucesso") && (
                <div className="validador-status-overlay sucesso">
                  <CheckCircle className="validador-icon" />
                </div>
              )}
              {linha.status?.toLowerCase().includes("erro") && (
                <div className="validador-status-overlay erro">
                  <XCircle className="validador-icon" />
                </div>
              )}
              {linha.status === "carregando" && (
                <div className="validador-status-overlay carregando">
                  <Loader2 className="validador-icon loader" />
                </div>
              )}
            </td>
            {/* CAPTCHAS VISUAIS */}
            {linha.status === 'captcha' && (
              <td colSpan={5} className="validador-tabela-captcha-overlay-cell">
                <div className={`validador-captcha-overlay validador-captcha-bg-${linha.status?.toLowerCase()}`}>
                  <img
                    src={`data:image/png;base64,${linha.captchaImg}`}
                    alt="captcha"
                    width={100}
                    height={30}
                  />
                  <input
                    type="text"
                    maxLength={5}
                    onChange={(e) =>
                      setRespostaCaptcha((prev) => ({
                        ...prev,
                        [linha.linha]: e.target.value,
                      }))
                    }
                    className="validador-captcha-input"
                  />
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Tabela especial para erros
function renderTabelaErros(linhas: any[]) {
  return (
    <table className="validador-tabela validador-tabela-erro">
      <thead>
        <tr>
          <th>Linha</th>
          <th>Empresa</th>
          <th>CNPJ</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <>
            <tr
              key={linha.linha}
              className="validador-tabela-row status-erro validador-tabela-row-erro"
              style={{ borderBottom: '2px solid #e57373', borderLeft: '4px solid #e57373', background: '#fff6f6' }}
            >
              <td>
                <div className="validador-tabela-circulo erro" style={{ background: 'linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)', color: '#fff', border: '1.5px solid #e57373' }}>
                  {linha.linha}
                </div>
              </td>
              <td>{linha.empresa?.toString().slice(0, 23)}</td>
              <td>{linha.CNPJ}</td>
            </tr>
            <tr key={linha.linha + '-motivo'}>
              <td colSpan={3} style={{ color: '#b71c1c', fontSize: 13, padding: '4px 12px 10px 32px', background: '#fff6f6', borderBottom: '2px solid #e57373' }}>
                <strong>Motivo:</strong> {linha.motivo || linha.mensagemErro || linha.status || 'Erro desconhecido'}
              </td>
            </tr>
          </>
        ))}
      </tbody>
    </table>
  );
}

// ListaStatusEmpresas removido pois não é utilizado
const [modoLogin,      setModoLogin]      = useState<'automatico' | 'manual'>('manual');
const [resolucao,      setResolucao]      = useState<'FHD' | 'QHD'>('FHD');
const [qtdNavegadores, setQtdNavegadores] = useState<number>(1);

return (
  <div className="validador-container">
    <div className="validador-top-row">
      <div className="validador-header-info">
        <h1 className="validador-titulo">{empresa.nome}</h1>
        <div className="validador-empresa-dados">
          <span><strong>CNPJ:</strong> {empresa.cnpj}</span>
          <span><strong>Clientes:</strong> {empresa.clientes}</span>
        </div>
      </div>
      <div>
        <input
          id="input-planilha"
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button onClick={handleImportarClick} className="validador-importar-btn">
          Importar Planilha
        </button>
      </div>
    </div>

    <div className="validador-actions-bar">
      <div className="validador-actions-left">
        <label className="validador-label-modo">
          <span>Modo:</span>
          {/* automático / manual */}
          <select
            className="validador-select-modo"
            value={modoLogin}
            onChange={e => setModoLogin(e.target.value as 'automatico' | 'manual')}
          >
            <option value="automatico">Automático</option>
            <option value="manual">Manual</option>
          </select>
          {/* resolução */}
          <select
            className="validador-select-modo"
            value={resolucao}
            onChange={e => setResolucao(e.target.value as 'FHD' | 'QHD')}
          >
            <option value="FHD">FHD</option>
            <option value="QHD">QHD</option>
          </select>
          {/* quantidade de navegadores */}
          <select
            className="validador-select-modo"
            value={qtdNavegadores}
            onChange={e => setQtdNavegadores(parseInt(e.target.value, 10))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </label>
        {/* Exibe o card de captcha somente se modoLogin for 'manual' */}
        {modoLogin === 'manual' && (
          <div className="validador-captcha-card">
            <span className="validador-captcha-label">Captcha:</span>
            <div className="validador-captcha-img-area">
              {captchaImgBase64 ? (
                <img src={`data:image/png;base64,${captchaImgBase64}`} alt="captcha" />
              ) : (
                <span style={{ color: "#2563eb", opacity: 0.7, fontWeight: 600, fontSize: 13 }}></span>
              )}
            </div>
            <input
              className="validador-captcha-input"
              type="text"
              maxLength={5}
              pattern="[0-9]*"
              inputMode="numeric"
              value={captchaInput}
              onChange={e => setCaptchaInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="00000"
            />
          </div>
        )}
      </div>
      <div className="validador-actions-center">
          <button className="validador-btn-executar" type="button" onClick={executarValidacao}>
            Executar
          </button>
        <button className="validador-btn-executar" type="button" onClick={salvarNoBackend}>
          Salvar
        </button>
      </div>
      <div className="validador-actions-right">
        <button
          className="validador-btn-exportar"
          type="button"
        >
          Exportar PDF
        </button>
      </div>
    </div>

    <div className="validador-tabela-dupla">
      <div>{renderTabela(linhasAtivas)}</div>
      <div>{renderTabelaErros(linhasComErro)}</div>
    </div>
  </div>
);
}

