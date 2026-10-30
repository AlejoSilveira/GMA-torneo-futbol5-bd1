import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function Login() { return <h1>Login</h1>; }
function Admin() { return <h1>Panel administrador</h1>; }
function Planillero() { return <h1>Panel planillero</h1>; }
function Reportes() { return <h1>Reportes</h1>; }

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/">Login</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/planillero">Planillero</Link>
        <Link to="/reportes">Reportes</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/planillero" element={<Planillero />} />
        <Route path="/reportes" element={<Reportes />} />
      </Routes>
    </BrowserRouter>
  );
}