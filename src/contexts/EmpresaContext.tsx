import { createContext, useContext, useState, type ReactNode } from 'react';

// Tipo da empresa
export interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  login: string;
  senha: string;
  clientes: number;
  logoUrl?: string;
}

// Interface do contexto
interface EmpresaContextType {
  empresaSelecionada: Empresa | null;
  selecionarEmpresa: (empresa: Empresa) => void;
  limparEmpresaSelecionada: () => void;
}

// Criação do contexto
const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

// Hook personalizado para usar o contexto
export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error('useEmpresa deve ser usado dentro de um EmpresaProvider');
  }
  return context;
}

// Props do provider
interface EmpresaProviderProps {
  children: ReactNode;
}

// Provider do contexto
export function EmpresaProvider({ children }: EmpresaProviderProps) {
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);

  const selecionarEmpresa = (empresa: Empresa) => {
    setEmpresaSelecionada(empresa);
  };

  const limparEmpresaSelecionada = () => {
    setEmpresaSelecionada(null);
  };

  return (
    <EmpresaContext.Provider
      value={{
        empresaSelecionada,
        selecionarEmpresa,
        limparEmpresaSelecionada,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}
