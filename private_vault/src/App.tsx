
import './App.css'
import AuthPage from './AuthPage'
import Dashboard from './DashBoard';
import Home from './Home'
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";



function App() {

  return (
    <>
    <Router>
<Routes>
  <Route path="/" element={<Home/>} />
  <Route path="/Login" element={<AuthPage />} />
  <Route path="/dashboard" element={<Dashboard />} />
</Routes>
</Router>
    </>
  )
}


export default App
