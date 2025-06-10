import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import "../styles/Contabilidades.scss";

// Simulação de dados globais (substitua por contexto/backend depois)
const empresasMock = [
  {
    id: 1,
    nome: "SCS Contabilidade",
    cnpj: "12.345.678/0001-90",
    endereco: "Rua das Flores, 123",
    telefone: "(11) 99999-8888",
    email: "scs@email.com",
    login: "scsuser",
    senha: "123456",
    clientes: 18,
  },
  {
    id: 2,
    nome: "ABC Consultoria",
    cnpj: "98.765.432/0001-10",
    endereco: "Av. Brasil, 456",
    telefone: "(21) 98888-7777",
    email: "abc@email.com",
    login: "abcuser",
    senha: "abcdef",
    clientes: 7,
  },
];

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
      const empresa = empresasMock.find((e) => String(e.id) === id);
      if (empresa) setForm(empresa);
    }
  }, [id]);

  function validarCNPJ(cnpj: string) {
    return /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(cnpj);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const novoErros: { [k: string]: string } = {};
    if (!validarCNPJ(form.cnpj)) novoErros.cnpj = "CNPJ inválido";
    if (!validarTelefone(form.telefone)) novoErros.telefone = "Telefone inválido";
    if (!validarSenha(form.senha)) novoErros.senha = "Mínimo 6 caracteres";
    setErros(novoErros);
    if (Object.keys(novoErros).length > 0) return;
    navigate("/contabilidades");
  }

  return (
    <div className="page-contabilidades-wrapper">
      <div className="form-container">
        {/* Removido o título dinâmico */}
        <form onSubmit={handleSubmit} autoComplete="off">
          <label>
            Nome da empresa:
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
              maxLength={80}
              className="input-form"
            />
          </label>
          <label>
            CNPJ:
            <input
              type="text"
              name="cnpj"
              value={form.cnpj}
              onChange={handleChange}
              required
              maxLength={18}
              className={`input-form${erros.cnpj ? " input-error" : ""}`}
              placeholder="00.000.000/0000-00"
            />
            {erros.cnpj && <span className="error-message">{erros.cnpj}</span>}
          </label>
          <label>
            Endereço:
            <input
              type="text"
              name="endereco"
              value={form.endereco}
              onChange={handleChange}
              required
              maxLength={120}
              className="input-form"
            />
          </label>
          <label>
            Número de contato:
            <input
              type="text"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              required
              maxLength={15}
              className={`input-form${erros.telefone ? " input-error" : ""}`}
              placeholder="(99) 99999-9999"
            />
            {erros.telefone && <span className="error-message">{erros.telefone}</span>}
          </label>
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              maxLength={100}
              className="input-form"
            />
          </label>
          <label>
            Login:
            <input
              type="text"
              name="login"
              value={form.login}
              onChange={handleChange}
              required
              maxLength={32}
              className="input-form"
            />
          </label>
          <label className="senha-label">
            Senha:
            <div className="senha-input-wrapper">
              <input
                type={showSenha ? "text" : "password"}
                name="senha"
                value={form.senha}
                onChange={handleChange}
                required
                maxLength={32}
                className={`input-form${erros.senha ? " input-error" : ""}`}
              />
              <button
                type="button"
                tabIndex={-1}
                className="senha-eye-btn"
                onClick={() => setShowSenha((v) => !v)}
                aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {showSenha ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {erros.senha && <span className="error-message">{erros.senha}</span>}
          </label>
          <label>
            Número de clientes:
            <input
              type="number"
              name="clientes"
              value={form.clientes}
              onChange={handleChange}
              min={0}
              required
              max={9999}
              className="input-form"
            />
          </label>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
            <button type="submit">Salvar</button>
            <button type="button" onClick={() => navigate("/contabilidades")}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
