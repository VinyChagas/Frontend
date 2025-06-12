import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import Relatorios from "./pages/Relatorios";
import CentroCusto from "./pages/CentroCusto";
import Validador from "./pages/Validador";
import Contabilidades from "./pages/Contabilidades";
import ContabilidadeForm from "./pages/ContabilidadeForm";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route path="home" element={<Home />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="centro-custo" element={<CentroCusto />} />
          <Route path="validador" element={<Validador />} />
          <Route path="contabilidades" element={<Contabilidades />} />
          <Route path="contabilidades/novo" element={<ContabilidadeForm />} />
          <Route path="contabilidades/:id" element={<ContabilidadeForm />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}