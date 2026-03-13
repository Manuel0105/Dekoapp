import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

export default App;
