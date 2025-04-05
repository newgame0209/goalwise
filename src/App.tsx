import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import Dashboard from '@/pages/Dashboard';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import SignUp from '@/pages/SignUp';
import Profile from '@/pages/Profile';
import Profiling from '@/pages/Profiling';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotFound from '@/pages/NotFound';
import { SidebarProvider } from '@/components/ui/sidebar';
import { LearningChatProvider } from '@/components/LearningChat/LearningChatState';
import { ChatStateProvider } from '@/components/ChatWidget/ChatState';
import ApiKeyManager from '@/components/ApiKeyManager';
import ModuleViewer from '@/pages/ModuleViewer';
import ProgressDashboard from '@/components/Dashboard/ProgressDashboard';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Router>
        <AuthProvider>
          <ApiKeyManager />
          <ChatStateProvider>
            <LearningChatProvider>
              <SidebarProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/progress" element={
                    <ProtectedRoute>
                      <ProgressDashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profiling" element={
                    <ProtectedRoute>
                      <Profiling />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/modules/:moduleId" element={
                    <ProtectedRoute>
                      <ModuleViewer />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/material-samples" element={<ModuleViewer />} />
                  
                  <Route path="/not-found" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/not-found" replace />} />
                </Routes>
                <Toaster />
              </SidebarProvider>
            </LearningChatProvider>
          </ChatStateProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
