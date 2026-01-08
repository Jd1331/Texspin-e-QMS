
import * as asdb from './sqlService';
import { supabase } from './supabaseClient';
import { User, UserRole, ControlPlan, InspectionRecord, NCRecord, PokaYokeRecord, ProcessSetupMaster, ProcessSetupRecord, ProcessValidationPlan, Instrument, PartMaster, ProductionEntry, ControlPlanChangeLog } from '../types';

// --- AUTHENTICATION & USER MANAGEMENT ---

export const login = async (email: string, password: string): Promise<User> => {
    // 1. Authenticate with Supabase Auth (Identity Provider)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error("Supabase Auth Error:", JSON.stringify(authError, null, 2));
        let msg = authError.message;
        if (msg === "Invalid login credentials") msg = "Invalid email or password.";
        if (msg.includes("Failed to fetch")) msg = "Network Error: Could not connect to authentication server. Please check your internet connection.";
        throw new Error(msg);
    }

    if (!authData.user) {
        throw new Error("Authentication failed. No user data returned.");
    }

    // 2. Fetch User Profile from 'app_users' table (Authorization & Profile)
    // We DO NOT store passwords in this table.
    const { data: userProfile, error: profileError } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (profileError) {
        console.error("Profile Fetch Error Details:", JSON.stringify(profileError, null, 2));

        // HANDLE MISSING PROFILE (PGRST116: JSON object requested, multiple (or no) rows returned)
        // If the user exists in Auth but not in app_users, we create a default profile.
        if (profileError.code === 'PGRST116') {
            console.log("Profile missing for authenticated user. Auto-creating default profile...");
            const defaultProfile = {
                id: authData.user.id,
                user_code: 'USR-' + Math.floor(Math.random() * 10000),
                name: authData.user.email?.split('@')[0] || 'User',
                email: authData.user.email,
                role: 'VIEW_ONLY', // Default safe role
                department: 'General',
                status: 'ACTIVE'
            };
            
            const { error: insertError } = await supabase.from('app_users').insert(defaultProfile);
            if (insertError) {
                console.error("Failed to auto-create profile:", JSON.stringify(insertError, null, 2));
                throw new Error("Account exists but Profile setup failed. (RLS Violation? Run Schema Script): " + insertError.message);
            }

            // Return the newly created user structure
            const user: User = {
                id: defaultProfile.id,
                userCode: defaultProfile.user_code,
                name: defaultProfile.name,
                email: defaultProfile.email || '',
                role: defaultProfile.role as UserRole,
                department: defaultProfile.department,
                status: defaultProfile.status as any
            };
            localStorage.setItem('EQMS_USER', JSON.stringify(user));
            return user;
        }

        // Handle Table Not Found (42P01) or other DB errors
        const msg = profileError.message.includes("does not exist") 
            ? "Database Configuration Error: Tables not found. Please run the SQL schema script."
            : `Profile Error: ${profileError.message}`;
            
        await supabase.auth.signOut();
        throw new Error(msg);
    }

    if (!userProfile) {
        await supabase.auth.signOut();
        throw new Error("User profile not found.");
    }

    // 3. Enforce Account Status
    if (userProfile.status !== 'ACTIVE') {
        await supabase.auth.signOut();
        throw new Error("Account is INACTIVE. Access denied.");
    }

    // 4. Construct User Object for Session
    const user: User = {
        id: authData.user.id,
        userCode: userProfile.user_code || 'N/A',
        name: userProfile.name,
        email: authData.user.email || email, 
        role: userProfile.role as UserRole,
        department: userProfile.department || 'General',
        status: userProfile.status
    };
    
    // 5. Persist Session locally for app state
    localStorage.setItem('EQMS_USER', JSON.stringify(user));
    return user;
};

export const logout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Error signing out:", e);
    }
    localStorage.removeItem('EQMS_USER');
    window.location.href = "/"; // Force reload to clear React state
};

export const getCurrentUser = (): User => {
    const stored = localStorage.getItem('EQMS_USER');
    if (stored) {
        return JSON.parse(stored);
    }
    throw new Error("No active session");
};

// --- USER ADMINISTRATION ---

export const createUser = async (userData: User, password: string) => {
    // 1. Create User in Supabase Auth
    // IMPORTANT: We pass all profile data in 'options.data'. 
    // The Database Trigger 'on_auth_user_created' will use this to automatically create the 'app_users' row.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: password,
        options: {
            data: {
                name: userData.name,
                role: userData.role,
                department: userData.department,
                userCode: userData.userCode
            }
        }
    });

    if (authError) {
        console.error("Sign Up Error:", JSON.stringify(authError, null, 2));
        let msg = authError.message;
        if (msg.includes("Failed to fetch")) msg = "Network Error: Could not connect to Supabase.";
        throw new Error(msg);
    }
    
    if (!authData.user) throw new Error("Failed to create auth user (check email confirmation settings)");

    // NOTE: We do NOT manually insert into 'app_users' here anymore. 
    // The Trigger handles it securely. This avoids RLS violations.

    return authData.user;
};

export const saveUser = async (user: User) => {
    // Only updates profile information.
    // Passwords are NOT handled here.
    const profile = {
        user_code: user.userCode,
        name: user.name,
        role: user.role,
        department: user.department,
        status: user.status
    };

    const { error } = await supabase
        .from('app_users')
        .update(profile)
        .eq('id', user.id);

    if (error) {
        console.error("Save User Error:", JSON.stringify(error, null, 2));
        let msg = error.message;
        if (msg.includes("Failed to fetch")) msg = "Network Error: Could not save user profile.";
        throw new Error(msg);
    }
};

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('name');
        
    if (error) {
        // If table doesn't exist yet, return empty list to trigger Setup screen in Login.tsx
        if (error.code === '42P01') return [];
        
        console.error("Get Users Error:", JSON.stringify(error, null, 2));
        let msg = error.message;
        if (msg.includes("Failed to fetch")) msg = "Network Error: Could not fetch users.";
        throw new Error(msg);
    }
    
    return data.map((u: any) => ({
        id: u.id,
        userCode: u.user_code,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        department: u.department,
        status: u.status
    }));
};

export const toggleUserStatus = async (id: string) => {
    const { data, error } = await supabase.from('app_users').select('status').eq('id', id).single();
    if (error) throw new Error(error.message);

    const newStatus = data.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const { error: updateError } = await supabase
        .from('app_users')
        .update({ status: newStatus })
        .eq('id', id);

    if (updateError) throw new Error(updateError.message);
};

// --- DATA ACCESS WRAPPERS (Business Logic) ---

// PARTS MASTER
export const getPartsMaster = async () => asdb.getPartsMaster();
export const uploadPartsMaster = async (parts: PartMaster[]) => asdb.bulkUpsertParts(parts);

// PRODUCTION ENTRY
export const getProductionHistory = async () => asdb.getProductionEntries();
export const saveProductionEntry = async (entry: Omit<ProductionEntry, 'id' | 'created_at'>) => {
    try {
        const user = getCurrentUser();
        const entryWithUser = { ...entry, created_by: user.id };
        await asdb.saveProductionEntry(entryWithUser);
    } catch (e) {
        console.error("Failed to attach user ID to production entry", e);
        await asdb.saveProductionEntry(entry);
    }
};

// CONTROL PLAN
export const getAllControlPlans = async (): Promise<ControlPlan[]> => {
    const plans = await asdb.getAll<ControlPlan>('control_plans');
    return plans.sort((a,b) => b.version - a.version);
};

export const getControlPlanById = async (id: string): Promise<ControlPlan | undefined> => {
    const plans = await getAllControlPlans();
    return plans.find(cp => cp.id === id);
};

export const getActiveControlPlan = async (partNumber: string, processFamily?: string): Promise<ControlPlan | undefined> => {
    const plans = await getAllControlPlans();
    return plans.find(cp => 
        cp.partNumber === partNumber && 
        cp.status === 'ACTIVE' &&
        (!processFamily || cp.processFamily === processFamily)
    );
};

export const saveControlPlan = async (plan: ControlPlan, reason: string) => {
    await asdb.saveRecord('control_plans', plan);
    const log: ControlPlanChangeLog = {
        id: crypto.randomUUID(),
        controlPlanNumber: plan.controlPlanNumber,
        version: plan.version,
        previousVersion: plan.version - 1,
        changedBy: getCurrentUser().name,
        changeDate: new Date().toISOString(),
        changeReason: reason,
        changes: []
    };
    await asdb.saveRecord('control_plan_logs', log);
};

export const getControlPlanLogs = async (cpNumber: string): Promise<ControlPlanChangeLog[]> => {
    const logs = await asdb.getAll<ControlPlanChangeLog>('control_plan_logs');
    return logs.filter(l => l.controlPlanNumber === cpNumber).sort((a,b) => b.version - a.version);
};

// INSPECTIONS
export const getInspectionHistory = async () => asdb.getAll<InspectionRecord>('inspections');
export const saveInspection = async (rec: InspectionRecord) => asdb.saveRecord('inspections', rec);
export const getPendingInspections = async () => {
    const all = await getInspectionHistory();
    return all.filter(r => r.status === 'SUBMITTED');
};
export const approveInspection = async (id: string, status: any, remark: string) => {
    const all = await getInspectionHistory();
    const rec = all.find(r => r.id === id);
    if(rec) {
        rec.status = status;
        rec.approvalRemark = remark;
        rec.approvalDate = new Date().toISOString();
        rec.approvedBy = getCurrentUser().name;
        rec.approverId = getCurrentUser().id;
        await asdb.saveRecord('inspections', rec);
        return rec;
    }
    throw new Error("Record not found");
};

export const getLastInspectionTime = async (part: string, family: string, type: string): Promise<Date | null> => {
    const all = await getInspectionHistory();
    const filtered = all.filter(r => r.partNumber === part && r.processFamily === family && r.type === type);
    if (filtered.length === 0) return null;
    filtered.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return new Date(filtered[0].timestamp);
};

// GENERIC UTILS
export const getUniqueParts = async () => {
    try {
        const parts = await asdb.getPartsMaster();
        if (parts.length > 0) return parts.map(p => p.part_no);
    } catch (e) {
        console.warn("Could not fetch parts from SQL table, falling back to document store", e);
    }
    const plans = await getAllControlPlans();
    return Array.from(new Set(plans.map(p => p.partNumber)));
};

export const getUserSignature = (id: string) => undefined;

// NC CAPA
export const getNCRecords = async () => asdb.getAll<NCRecord>('nc_records');
export const updateNCStatus = async (id: string, updates: Partial<NCRecord>) => {
    const all = await getNCRecords();
    const nc = all.find(n => n.id === id);
    if (nc) {
        Object.assign(nc, updates);
        await asdb.saveRecord('nc_records', nc);
    }
};

// POKA YOKE
export const getPokaYokeHistory = async () => asdb.getAll<PokaYokeRecord>('poka_yoke');
export const savePokaYoke = async (rec: PokaYokeRecord) => asdb.saveRecord('poka_yoke', rec);
export const getPendingPokaYokes = async () => {
    const all = await getPokaYokeHistory();
    return all.filter(r => r.status === 'SUBMITTED');
};
export const approvePokaYoke = async (id: string, status: any, remark: string) => {
    const all = await getPokaYokeHistory();
    const rec = all.find(r => r.id === id);
    if(rec) {
        rec.status = status;
        rec.approvalRemark = remark;
        rec.approvedBy = getCurrentUser().name;
        await asdb.saveRecord('poka_yoke', rec);
    }
};

// PROCESS SETUP
export const getProcessSetupHistory = async () => asdb.getAll<ProcessSetupRecord>('process_logs');
export const getPendingProcessSetups = async () => {
    const all = await getProcessSetupHistory();
    return all.filter(r => r.status === 'SUBMITTED');
};
export const saveProcessMaster = async (master: ProcessSetupMaster) => asdb.saveRecord('process_masters', master);
export const getProcessMaster = async (partNumber: string): Promise<ProcessSetupMaster | undefined> => {
    const all = await asdb.getAll<ProcessSetupMaster>('process_masters');
    return all.find(m => m.partNumber === partNumber);
};
export const saveProcessSetupRecord = async (rec: ProcessSetupRecord) => asdb.saveRecord('process_logs', rec);
export const approveProcessSetup = async (id: string, status: any, remark: string) => {
    const all = await getProcessSetupHistory();
    const rec = all.find(r => r.id === id);
    if(rec) {
        rec.status = status;
        rec.approvalRemark = remark;
        rec.approvedBy = getCurrentUser().name;
        await asdb.saveRecord('process_logs', rec);
    }
};

// VALIDATION
export const getValidationPlans = async () => asdb.getAll<ProcessValidationPlan>('validation_plans');
export const getPendingValidations = async () => {
    const all = await getValidationPlans();
    return all.filter(r => r.status === 'SUBMITTED');
};
export const saveValidationPlan = async (plan: ProcessValidationPlan) => asdb.saveRecord('validation_plans', plan);
export const approveValidationPlan = async (id: string, status: any, remark: string) => {
    const all = await getValidationPlans();
    const rec = all.find(r => r.id === id);
    if(rec) {
        rec.status = status;
        rec.approvalRemark = remark;
        rec.approvedBy = getCurrentUser().name;
        await asdb.saveRecord('validation_plans', rec);
    }
};
export const getValidationStatus = (plan: ProcessValidationPlan): 'VALID' | 'DUE_SOON' | 'OVERDUE' => {
    if (plan.status !== 'APPROVED') return 'VALID';
    const date = new Date(plan.validationDate);
    date.setMonth(date.getMonth() + plan.frequencyMonths);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const diffDays = diff / (1000 * 3600 * 24);
    if (diffDays < 0) return 'OVERDUE';
    if (diffDays < 15) return 'DUE_SOON';
    return 'VALID';
};
export const getValidationAnalytics = async () => {
    const plans = await getValidationPlans();
    const active = plans.filter(p => p.status === 'APPROVED');
    const total = active.length;
    let valid = 0, dueSoon = 0, overdue = 0;
    active.forEach(p => {
        const s = getValidationStatus(p);
        if(s === 'VALID') valid++;
        if(s === 'DUE_SOON') dueSoon++;
        if(s === 'OVERDUE') overdue++;
    });
    return {
        total, valid, dueSoon, overdue,
        chartData: [{ name: 'Assembly', Total: total, Overdue: overdue }]
    };
};

// DASHBOARD
export const getPPMData = async () => [
    { name: 'Jan', ppm: 1200 },
    { name: 'Feb', ppm: 900 },
    { name: 'Mar', ppm: 850 },
];
export const getInstruments = async () => asdb.getAll<Instrument>('instruments');

export const ensureSeedData = async () => { /* No-op */ };
