import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Eye, EyeSlash, UploadSimple } from "@phosphor-icons/react";
import "../styles/Contabilidades.scss";
import axios from "axios";

// Tipo da empresa
type EmpresaForm = {
  id?: number;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  login: string;
  senha: string;
  clientes: number;
};

export default function ContabilidadeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState<EmpresaForm>({
    nome: "",
    cnpj: "",
    endereco: "",
    telefone: "",
    email: "",
    login: "",
    senha: "",
    clientes: 0,
  });
  const [showSenha, setShowSenha] = useState(false);
  const [erros, setErros] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:4000/empresas/${id}`)
        .then((res) => setForm(res.data))
        .catch((err) => {
          console.error("Erro ao buscar empresa para edição:", err);
          alert("Erro ao carregar dados da empresa.");
        });
    }
  }, [id]);

  function validarCNPJ(cnpj: string) {
    const apenasNumeros = cnpj.replace(/[^\d]/g, "");
    return /^\d{14}$/.test(apenasNumeros);
  }
  function validarTelefone(tel: string) {
    return /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(tel);
  }
  function validarSenha(s: string) {
    return s.length >= 6;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "clientes" ? Number(value) : value,
    }));
    setErros((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const novoErros: { [k: string]: string } = {};
    if (!validarCNPJ(form.cnpj)) novoErros.cnpj = "CNPJ inválido";
    if (!validarTelefone(form.telefone)) novoErros.telefone = "Telefone inválido";
    if (!validarSenha(form.senha)) novoErros.senha = "Mínimo 6 caracteres";
    setErros(novoErros);
    if (Object.keys(novoErros).length > 0) return;

    try {
      if (id) {
        await axios.put(`http://localhost:4000/empresas/${id}`, form);
        alert("Empresa atualizada com sucesso!");
      } else {
        await axios.post("http://localhost:4000/empresas", form);
        alert("Empresa cadastrada com sucesso!");
      }
      navigate("/contabilidades");
    } catch (error) {
      console.error("Erro ao salvar empresa", error);
      alert("Erro ao salvar empresa. Verifique os dados.");
    }
  }

  return (
    <div className="page-contabilidades-wrapper">
      <div className="form-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>Dados Cadastrais</h2>
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "linear-gradient(90deg, #2563eb 60%, #38bdf8 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.01rem",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 1.2rem",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(56,189,248,0.13)",
            }}
          >
            <UploadSimple size={18} /> Importar CNPJ
          </button>
        </div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.7rem" }}>
            <label style={{ flex: 2 }}>
              Nome da empresa:
              <input type="text" name="nome" value={form.nome} onChange={handleChange} required maxLength={80} className="input-form" />
            </label>
            <label style={{ flex: 1.2 }}>
              CNPJ:
              <input type="text" name="cnpj" value={form.cnpj} onChange={handleChange} required maxLength={18} className={`input-form${erros.cnpj ? " input-error" : ""}`} placeholder="00.000.000/0000-00" />
              {erros.cnpj && <span className="error-message">{erros.cnpj}</span>}
            </label>
            <label style={{ flex: 2 }}>
              Email:
              <input type="email" name="email" value={form.email} onChange={handleChange} required maxLength={100} className="input-form" />
            </label>
          </div>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.7rem" }}>
            <label style={{ flex: 2 }}>
              Endereço:
              <input type="text" name="endereco" value={form.endereco} onChange={handleChange} required maxLength={120} className="input-form" />
            </label>
            <label style={{ flex: 1 }}>
              Número de contato:
              <input type="text" name="telefone" value={form.telefone} onChange={handleChange} required maxLength={15} className={`input-form${erros.telefone ? " input-error" : ""}`} placeholder="(99) 99999-9999" />
              {erros.telefone && <span className="error-message">{erros.telefone}</span>}
            </label>
          </div>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.7rem" }}>
            <label style={{ flex: 1 }}>
              Login:
              <input type="text" name="login" value={form.login} onChange={handleChange} required maxLength={32} className="input-form" />
            </label>
            <label className="senha-label" style={{ flex: 1 }}>
              Senha:
              <div className="senha-input-wrapper">
                <input type={showSenha ? "text" : "password"} name="senha" value={form.senha} onChange={handleChange} required maxLength={32} className={`input-form${erros.senha ? " input-error" : ""}`} />
                <button type="button" tabIndex={-1} className="senha-eye-btn" onClick={() => setShowSenha((v) => !v)} aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}>
                  {showSenha ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {erros.senha && <span className="error-message">{erros.senha}</span>}
            </label>
            <label style={{ flex: 0.7 }}>
              Nº clientes:
              <input type="number" name="clientes" value={form.clientes} onChange={handleChange} min={0} required max={9999} className="input-form" />
            </label>
          </div>
          <div className="form-actions-row">
            <button type="button" className="importar-logo-btn">
              <UploadSimple size={15} /> Importar Logo
            </button>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="submit">Salvar</button>
              <button type="button" onClick={() => navigate("/contabilidades")}>Cancelar</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
