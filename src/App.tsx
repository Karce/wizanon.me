import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import CompoundInterestCalculator from './pages/CompoundInterestCalculator'
import FireCalculator from './pages/FireCalculator'
import NetWorthTracker from './pages/NetWorthTracker'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/compound-interest" element={<CompoundInterestCalculator />} />
        <Route path="/fire-calculator" element={<FireCalculator />} />
        <Route path="/net-worth" element={<NetWorthTracker />} />
      </Route>
    </Routes>
  )
}

export default App
