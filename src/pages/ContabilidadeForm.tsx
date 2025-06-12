import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Eye, UploadSimple, CheckCircle } from "@phosphor-icons/react";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState<null | string>(null);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:4000/empresas/${id}`)
        .then((res) => setForm(res.data as EmpresaForm))
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
    const apenasNumeros = tel.replace(/\D/g, "");
    return (
      apenasNumeros.length === 10 ||
      apenasNumeros.length === 11
    );
  }
  function validarSenha(s: string) {
    const min = 8;
    const max = 12;
    const temMin = s.length >= min;
    const temMax = s.length <= max;
    const temMaiuscula = /[A-Z]/.test(s);
    const temMinuscula = /[a-z]/.test(s);
    const temNumero = /\d/.test(s);
    const temEspecial = /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?`~]/.test(s);
    return temMin && temMax && temMaiuscula && temMinuscula && temNumero && temEspecial;
  }

  // Função para retornar mensagem do que está faltando na senha
  function senhaFeedback(s: string): string {
    const min = 8;
    const max = 12;
    if (s.length < min) return "";
    const faltando: string[] = [];
    if (s.length > max) faltando.push("máximo 12 caracteres");
    if (!/[A-Z]/.test(s)) faltando.push("letra maiúscula");
    if (!/[a-z]/.test(s)) faltando.push("letra minúscula");
    if (!/\d/.test(s)) faltando.push("número");
    if (!/[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?`~]/.test(s)) faltando.push("caractere especial");
    return faltando.length > 0 ? "Faltando: " + faltando.join(", ") : "";
  }

  // Máscara fixa de CNPJ: __.___.___/____-__
  function formatCNPJMask(digits: string) {
    digits = digits.replace(/\D/g, "").slice(0, 14);
    let cnpj = "";
    if (digits.length > 0) cnpj += digits.substring(0, 2);
    if (digits.length >= 3) cnpj += "." + digits.substring(2, 5);
    if (digits.length >= 6) cnpj += "." + digits.substring(5, 8);
    if (digits.length >= 9) cnpj += "/" + digits.substring(8, 12);
    if (digits.length >= 13) cnpj += "-" + digits.substring(12, 14);
    return cnpj;
  }

  // Máscara para telefone brasileiro (celular ou fixo)
  function formatTelefoneMask(digits: string) {
    digits = digits.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length === 1) return `(${digits}`;
    if (digits.length === 2) return `(${digits}`;
    if (digits.length <= 6) {
      // DDD + início do número
      return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    }
    if (digits.length <= 10) {
      // (99) 9999-9999
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
    // (99) 99999-9999
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === "cnpj") {
      const onlyDigits = value.replace(/\D/g, "").slice(0, 14);
      setForm((prev) => ({
        ...prev,
        [name]: onlyDigits,
      }));
      setErros((prev) => ({ ...prev, [name]: "" }));
    } else if (name === "telefone") {
      const onlyDigits = value.replace(/\D/g, "").slice(0, 11);
      setForm((prev) => ({
        ...prev,
        [name]: onlyDigits,
      }));
      setErros((prev) => ({ ...prev, [name]: "" }));
    } else if (name === "clientes") {
      setForm((prev) => ({
        ...prev,
        [name]: Number(value),
      }));
      setErros((prev) => ({ ...prev, [name]: "" }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
      setErros((prev) => ({ ...prev, [name]: "" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const novoErros: { [k: string]: string } = {};
    if (!validarCNPJ(form.cnpj)) novoErros.cnpj = "CNPJ inválido";
    if (!validarTelefone(form.telefone)) novoErros.telefone = "Telefone inválido";
    if (!validarSenha(form.senha)) {
      novoErros.senha =
        "A senha deve ter 8-12 caracteres, incluir maiúscula, minúscula, número e caractere especial.";
    }
    setErros(novoErros);
    if (Object.keys(novoErros).length > 0) return;

    try {
      if (id) {
        await axios.put(`http://localhost:4000/empresas/${id}`, form);
        setShowSuccess("Empresa atualizada com sucesso!");
      } else {
        await axios.post("http://localhost:4000/empresas", form);
        setShowSuccess("Empresa cadastrada com sucesso!");
      }
      setShowLoading(true);
      setTimeout(() => {
        setShowSuccess(null);
        setShowLoading(false);
        navigate("/contabilidades");
      }, 3500);
    } catch (error) {
      console.error("Erro ao salvar empresa", error);
      alert("Erro ao salvar empresa. Verifique os dados.");
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await axios.delete(`http://localhost:4000/empresas/${id}`);
      setShowDeleteModal(false);
      setShowSuccess("Empresa excluída com sucesso!");
      setShowLoading(true);
      setTimeout(() => {
        setShowSuccess(null);
        setShowLoading(false);
        navigate("/contabilidades");
      }, 3500);
    } catch (error) {
      setShowDeleteModal(false);
      alert("Erro ao excluir empresa.");
    }
  }

  return (
    <div className="page-contabilidades-wrapper">
      <div className="form-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>Dados Cadastrais</h2>
          <input
            type="file"
            accept="application/pdf"
            id="input-cnpj"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const formData = new FormData();
              formData.append("cnpjFile", file);

              try {
                const response = await fetch("http://localhost:4000/api/upload-cnpj", {
                  method: "POST",
                  body: formData,
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.erro || `Erro HTTP: ${response.status}`);
                }

                const dados = await response.json();
                setForm(prev => ({
                  ...prev,
                  nome: dados.nome || prev.nome,
                  cnpj: dados.cnpj || prev.cnpj,
                  endereco: dados.endereco || prev.endereco,
                  telefone: dados.telefone || prev.telefone,
                  email: dados.email || prev.email,
                }));

                setShowSuccess("Dados importados com sucesso!");
                setShowLoading(true);
                setTimeout(() => {
                  setShowSuccess(null);
                  setShowLoading(false);
                }, 3500);
              } catch (err) {
                console.error("Erro no processamento do PDF:", err);
                alert(`Falha: ${err instanceof Error ? err.message : err}`);
              } finally {
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => document.getElementById("input-cnpj")?.click()}
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
          {/* Linha 1: Nome, CNPJ, Email */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.7rem" }}>
            <label style={{ flex: 2 }}>
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
            <label style={{ flex: 1.2 }}>
              CNPJ:
              <input
                type="text"
                name="cnpj"
                value={formatCNPJMask(form.cnpj)}
                onChange={handleChange}
                required
                maxLength={18}
                className={`input-form${erros.cnpj ? " input-error" : ""}`}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                style={{ fontFamily: "monospace, Arial, sans-serif", letterSpacing: "1px" }}
              />
              {erros.cnpj && <span className="error-message">{erros.cnpj}</span>}
            </label>
            <label style={{ flex: 2 }}>
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
          </div>

          {/* Linha 2: Endereço, Telefone */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.7rem" }}>
            <label style={{ flex: 2 }}>
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
            <label style={{ flex: 1 }}>
              Número de contato:
              <input
                type="text"
                name="telefone"
                value={formatTelefoneMask(form.telefone)}
                onChange={handleChange}
                required
                maxLength={15}
                className={`input-form${erros.telefone ? " input-error" : ""}`}
                placeholder="(99) 99999-9999"
                inputMode="numeric"
                style={{ fontFamily: "monospace, Arial, sans-serif", letterSpacing: "1px" }}
              />
              {erros.telefone && <span className="error-message">{erros.telefone}</span>}
              {/* Não mostrar feedback dinâmico, só mostra erro ao salvar */}
            </label>
          </div>

          {/* Linha 3: Login, Senha, Clientes */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.7rem" }}>
            <label style={{ flex: 1 }}>
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
            <label className="senha-label" style={{ flex: 1 }}>
              Senha:
              <div className="senha-input-wrapper">
                <input
                  type={showSenha ? "text" : "password"}
                  name="senha"
                  value={form.senha}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={12}
                  className={`input-form${erros.senha ? " input-error" : ""}`}
                  placeholder="Senha segura"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="senha-eye-btn"
                  onClick={() => setShowSenha((v) => !v)}
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  <Eye
                    size={20}
                    style={
                      showSenha
                        ? { opacity: 0.4, transform: "scaleX(-1)" }
                        : {}
                    }
                  />
                </button>
              </div>
              {erros.senha && (
                <span className="error-message">{erros.senha}</span>
              )}
              {!erros.senha && form.senha.length >= 8 && senhaFeedback(form.senha) && (
                <span className="error-message">{senhaFeedback(form.senha)}</span>
              )}
            </label>
            <label style={{ flex: 0.7 }}>
              Nº clientes:
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
          </div>

          {/* Botões finais */}
          <div className="form-actions-row">
            <button
              type="button"
              className="excluir-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "linear-gradient(90deg, #dc2626 60%, #f87171 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.01rem",
                border: "none",
                borderRadius: "8px",
                padding: "0.6rem 1.2rem",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(239,68,68,0.13)",
                minWidth: "110px",
                width: "110px", 
                justifyContent: "center"
              }}
              onClick={() => setShowDeleteModal(true)}
            >
              Excluir
            </button>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="submit" style={{ minWidth: "110px", width: "110px" }}>Salvar</button>
              <button type="button" onClick={() => navigate("/contabilidades")}>Cancelar</button>
            </div>
          </div>
          {/* Modal de confirmação de exclusão */}
          {showDeleteModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(30,41,59,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  color: "#222",
                  padding: "2rem 2.5rem",
                  borderRadius: "18px",
                  boxShadow: "0 8px 32px rgba(30,41,59,0.18)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1.2rem",
                  minWidth: "260px",
                  fontSize: "1.15rem",
                  fontWeight: 500,
                }}
              >
                <span>Tem certeza que deseja excluir esta empresa?</span>
                <div style={{ display: "flex", gap: "1.2rem" }}>
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 1.5rem",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.18s",
                    }}
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    style={{
                      background: "#e5e7eb",
                      color: "#222",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 1.5rem",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.18s",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Card de sucesso no canto esquerdo */}
          {showSuccess && (
            <div
              style={{
                position: "fixed",
                left: 24,
                bottom: 32,
                zIndex: 1000000, // maior que o loading
                pointerEvents: "none",
                animation: "slideUpDown 3.5s cubic-bezier(.4,0,.2,1)"
              }}
            >
              <div
                style={{
                  background: "linear-gradient(90deg, #22c55e 60%, #16a34a 100%)", // verde
                  color: "#fff",
                  padding: "1.2rem 2rem",
                  borderRadius: "14px",
                  boxShadow: "0 8px 32px rgba(30,41,59,0.18)",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.1rem",
                  minWidth: "260px",
                  fontSize: "1.13rem",
                  fontWeight: 600,
                }}
              >
                <CheckCircle size={28} weight="fill" color="#fff" style={{ flexShrink: 0 }} />
                <span>{showSuccess}</span>
              </div>
              <style>
                {`
                  @keyframes slideUpDown {
                    0% {
                      opacity: 0;
                      transform: translateY(40px);
                    }
                    10% {
                      opacity: 1;
                      transform: translateY(0);
                    }
                    90% {
                      opacity: 1;
                      transform: translateY(0);
                    }
                    100% {
                      opacity: 0;
                      transform: translateY(40px);
                    }
                  }
                `}
              </style>
            </div>
          )}
          {/* Tela de carregamento sobreposta enquanto a notificação aparece */}
          {showLoading && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(30,41,59,0.38)",
                zIndex: 999999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.3s"
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "2.2rem 2.5rem",
                  borderRadius: "18px",
                  boxShadow: "0 8px 32px rgba(30,41,59,0.18)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1.1rem",
                  minWidth: "220px",
                  fontSize: "1.15rem",
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: "4px solid #2563eb", // azul
                    borderTop: "4px solid #e5e7eb",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "1.1rem"
                  }}
                />
                <span style={{ color: "#2563eb" }}>Carregando...</span>
              </div>
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg);}
                    100% { transform: rotate(360deg);}
                  }
                `}
              </style>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
