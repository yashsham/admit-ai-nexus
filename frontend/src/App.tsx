import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ChatWidget } from "./components/ChatWidget";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { SkipLinks } from "./components/SkipLinks";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthNavigationHandler } from "./components/AuthNavigationHandler";
import { SplashScreen } from "./components/SplashScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import OurServices from "./pages/OurServices";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(false);
  const [appReady, setAppReady] = useState(true);

  useEffect(() => {
    // Check if we are on the reset password page
    const isResetPassword = window.location.pathname.includes("/reset-password");

    if (isResetPassword) {
      // Skip splash screen entirely for reset password to avoid token expiry
      setShowSplash(false);
      setAppReady(true);
    } else {
      // Force splash screen on every load/reload
      setShowSplash(true);
      // Reset app ready state
      setAppReady(false);
    }
  }, []);

  const handleSplashComplete = () => {
    setAppReady(true);
  };

  if (showSplash && !appReady) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AuthProvider>
                <HashRouter>
                  <AuthNavigationHandler />
                  <SkipLinks />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/our-services" element={<OurServices />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <AnalyticsDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <ChatWidget />
                  <PWAInstallPrompt />
                </HashRouter>
              </AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
