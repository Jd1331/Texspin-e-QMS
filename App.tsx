
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ControlPlanModule } from './pages/ControlPlanModule';
import { InspectionModule } from './pages/InspectionModule';
import { NCManagement } from './pages/NCManagement';
import { Dashboard } from './pages/Dashboard';
import { UserManagement } from './pages/UserManagement';
import { Login } from './pages/Login';
import { PokaYokeModule } from './pages/PokaYokeModule'; // New
import { ProcessApprovalModule } from './pages/ProcessApprovalModule'; // New
import { ProcessValidationModule } from './pages/ProcessValidationModule'; // New
import { ValidationDashboard } from './pages/ValidationDashboard'; // New
import * as db from './services/mockBackend';

// Simple Hash Router Implementation to avoid React Router dependency issues in this context
const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeModule, setActiveModule] = useState('dashboard');

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
        setActiveModule('dashboard');
    };

    const handleLogout = () => {
        db.logout();
        setIsAuthenticated(false);
    };

    const renderModule = () => {
        switch (activeModule) {
            case 'control-plan':
                return <ControlPlanModule />;
            case 'inspection':
                return <InspectionModule />;
            case 'nc-capa':
                return <NCManagement />;
            case 'user-management':
                return <UserManagement />;
            case 'poka-yoke':
                return <PokaYokeModule />;
            case 'process-approval':
                return <ProcessApprovalModule />;
            case 'process-validation':
                return <ProcessValidationModule />;
            case 'validation-summary':
                return <ValidationDashboard />;
            case 'dashboard':
            case 'calibration':
            case 'audit':
            case 'ppm':
            case 'spc':
                // Grouping analytics/monitoring modules into Dashboard for the demo
                // In a full build, these would have their own dedicated components similar to above
                return <Dashboard />;
            default:
                return <Dashboard />;
        }
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <Layout activeModule={activeModule} onNavigate={setActiveModule} onLogout={handleLogout}>
            {renderModule()}
        </Layout>
    );
};

export default App;
