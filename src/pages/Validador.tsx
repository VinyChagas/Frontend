import "../styles/Validador.scss";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";

const socket = io("http://localhost:4000");

export default function Validador() {
  const [empresa, setEmpresa] = useState({ nome: "", cnpj: "", clientes: 0 });
  const [linhasAtivas, setLinhasAtivas] = useState<any[]>([]);
  const [linhasComErro, setLinhasComErro] = useState<any[]>([]);
  const [respostaCaptcha, setRespostaCaptcha] = useState<Record<number, string>>({});

const [statusEmpresas, setStatusEmpresas] = useState<Record<string, any[]>>({});

useEffect(() => {
  socket.on("progresso", (info) => {
    const { linha, empresa, etapa, status, CNPJ } = info;

    // Atualiza status por CNPJ (visão geral)
    setStatusEmpresas((prev) => {
      const anterior = prev[CNPJ] || [];
      return {
        ...prev,
        [CNPJ]: [...anterior, { linha, empresa, etapa, status }]
      };
    });

    // Atualiza tabela da tela principal
    setLinhasAtivas((prev) => {
      const atualizada = prev.map((l) =>
        l.linha === linha
          ? {
              ...l,
              status: status,
              captchaImg: info.captchaBase64 || l.captchaImg,
            }
          : l
      );

      const removida = atualizada.filter((l) => {
        if (status.toLowerCase().includes("sucesso")) return true;
        setLinhasComErro((erroAntigo) => [...erroAntigo, { ...l, status }]);
        return false;
      });

      return removida;
    });
  });

  return () => {
    socket.off("progresso");
  };
}, []);


useEffect(() => {
  fetch("http://localhost:4000/empresas")
    .then((res) => res.json())
    .then((data) => {
      if (data.length > 0) {
        setEmpresa(data[0]);

        // Carrega JSON da contabilidade
        const nomeContabilidade = data[0].nome;
        fetch(`http://localhost:4000/empresas/validacoes/${encodeURIComponent(nomeContabilidade)}`)
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
  socket.on("progresso", (info) => {
    setLinhasAtivas((prev) => {
      const atualizada = prev.map((l) =>
        l.linha === info.linha
          ? {
              ...l,
              status: info.status,
              captchaImg: info.captchaBase64 || l.captchaImg,
            }
          : l
      );
      const removida = atualizada.filter((l) => {
        if (info.status.toLowerCase().includes("sucesso")) return true;
        if (!info.status.toLowerCase().includes("sucesso")) {
          setLinhasComErro((erroAntigo) => [
            ...erroAntigo,
            { ...l, status: info.status },
          ]);
          return false;
        }
      });
      return removida;
    });
  });

  return () => {
    socket.off("progresso");
  };
}, []);

useEffect(() => {
async function carregarValidacoes() {
  try {
    const res = await fetch(`http://localhost:4000/empresas/validacoes/${empresa.nome}`);
    if (!res.ok) return;

    const validacoesSalvas = await res.json();

    setLinhasAtivas((prev) =>
      prev.map((linha) => {
        const validada = validacoesSalvas.find((v: any) => v.linha === linha.linha);
        return validada
          ? { ...linha, status: validada.status || linha.status }
          : linha;
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

      const linhasProcessadas = rows.map((row: any, index: number) => ({
        linha: index + 2,
        Procurador: row["Procurador"]?.toUpperCase() || "",
        Presumido: row["Presumido"]?.toUpperCase() || "",
        empresa: row["empresa"] || "",
        CNPJ: row["CNPJ"] || "",
        usuario: row["usuario"] || "",
        senha: row["senha"] || "",
        status: "",
        captchaImg: "",
      }));

      setLinhasAtivas(linhasProcessadas);
      linhasProcessadas[0].status = "captcha";
      linhasProcessadas[0].captchaImg = "iVBOR..."; // base64 dummy

      // 🆕 Aqui você envia o arquivo para o backend
      handleUpload(file);
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
    const res = await fetch("http://localhost:4000/empresas/upload-planilha", {
      method: "POST",
      body: formData,
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      const linhasProcessadas = resultado.dados.map((row: any, index: number) => ({
        linha: row.linha || index + 2,
        procurador: row.procurador?.toUpperCase() || row["Procurador"]?.toUpperCase() || "",
        presumido: row.presumido?.toUpperCase() || "",
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

  setLinhasAtivas((prevLinhas) =>
    prevLinhas.map((linha) => ({
      ...linha,
      status: "carregando",
    }))
  );
  
  try {
    const res = await fetch("http://localhost:4000/api/executar-validacao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contabilidade: empresa.nome,
        modoLogin: modoLogin === 'automatico' ? 'Automático' : 'Manual',
        modoResolucao: resolucao,
        qtdNavegadores: qtdNavegadores,
        linhas: [] // isso diz ao backend: “a partir da linha 2”
      }),
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      alert("✅ Validação iniciada com sucesso!");
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
          <th>Status</th> {/* nova coluna */}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, idx) => (
          <tr key={idx} className="validador-tabela-row">
            <td>
              <div className="validador-tabela-circulo">{linha.linha}</div>
            </td>
            <td>
              <span className={`icone-status ${linha.Procurador === 'SIM' ? 'verde' : 'cinza'}`}>
                {linha.procurador === 'SIM' ? '✔' : ''}
              </span>
            </td>
            <td>
              <span className={`icone-status ${linha.Presumido === 'SIM' ? 'verde' : 'cinza'}`}>
                {linha.presumido === 'SIM' ? '✔' : ''}
              </span>
            </td>
            <td>{linha.empresa?.toString().slice(0, 23)}</td>
            <td>{linha.CNPJ}</td>

            {/* NOVA COLUNA DE STATUS COM ANIMAÇÕES */}
            <td className="validador-status-cell">
              {linha.status?.toLowerCase().includes('sucesso') && (
                <span className="validador-status-icone sucesso">✔</span>
              )}
              {linha.status?.toLowerCase().includes('erro') && (
                <span className="validador-status-icone erro">✖</span>
              )}
              {linha.status === 'carregando' && (
                <span className="validador-status-loader" />
              )}
              {linha.status === 'captcha' && (
                <span className="validador-status-captcha">🔐</span>
              )}
            </td>

            {/* CAPTCHAS VISUAIS (já existia) */}
            {linha.status === 'captcha' && (
              <td colSpan={6} className="validador-tabela-captcha-overlay-cell">
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

function ListaStatusEmpresas({ statusEmpresas }: { statusEmpresas: Record<string, any[]> }) {
  return (
    <div className="validador-status-por-cnpj">
      {Object.entries(statusEmpresas).map(([cnpj, etapas]) => (
        <div key={cnpj} className="validador-status-bloco">
          <h3>📄 {cnpj}</h3>
          <ul>
            {etapas.map((e, idx) => (
              <li key={idx}>
                <strong>Linha {e.linha}</strong> — {e.empresa} — <em>{e.etapa}</em>: {e.status}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
const [modoLogin,      setModoLogin]      = useState<'automatico' | 'manual'>('automatico');
const [resolucao,      setResolucao]      = useState<'FHD' | 'QHD'>('FHD');
const [qtdNavegadores, setQtdNavegadores] = useState<number>(8);

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

    {/* Adicione este bloco JSX logo abaixo do header (após o header cinza, antes das planilhas/tabelas) */}
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
      <div>{renderTabela(linhasComErro)}</div>
    </div>
  </div>
);
}
