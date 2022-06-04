import { Routes, Route } from 'react-router-dom';

import { NavBar } from './components/NavBar';

import Layout from './routes/layout';
import IndexRoute from './routes/index';
import ChatRoute from './routes/chat/$id';
import AboutRoute from './routes/about';

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<IndexRoute />} />
          <Route path="chat/:chatId" element={<ChatRoute />} />
          <Route path="about" element={<AboutRoute />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
