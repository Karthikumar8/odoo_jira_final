import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const ProjectListPage = lazy(() => import('./pages/ProjectList/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetail/ProjectDetailPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ReportingPage = lazy(() => import('./pages/Reporting/ReportingPage'));


const MyTasksPlaceholder = () => <div className="p-4">My Tasks (Protected)</div>;

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute allowedRoles={['superuser', 'manager', 'employee']} />}>
            <Route element={<Layout />}>
              <Route path="/my-tasks" element={<MyTasksPlaceholder />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reporting" element={<ReportingPage />} />
              <Route path="/projects" element={<ProjectListPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
            </Route>
          </Route>
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
