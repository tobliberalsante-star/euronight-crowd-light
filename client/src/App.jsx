import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ViewerPage from './pages/ViewerPage';
import DirectorPage from './pages/DirectorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ViewerPage />} />
        <Route path="/euronight" element={<DirectorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
