import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { VoyntProvider } from './context/VoyntContext';
import Cursor from './components/Cursor';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import SimulationPage from './pages/SimulationPage';
import HowItWorksPage from './pages/HowItWorksPage';
import CardsPage from './pages/CardsPage';

export default function App() {
    return (
        <VoyntProvider>
            <BrowserRouter>
                <Cursor />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/cards" element={<CardsPage />} />
                    <Route path="/how-it-works" element={<HowItWorksPage />} />
                    <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/simulation" element={<ProtectedRoute><SimulationPage /></ProtectedRoute>} />
                </Routes>
            </BrowserRouter>
        </VoyntProvider>
    );
}
