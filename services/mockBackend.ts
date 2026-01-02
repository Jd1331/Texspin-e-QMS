
import { 
    ControlPlan, PlanStatus, ControlPlanItem, InspectionRecord, NCRecord, NCStatus, 
    Instrument, ControlPlanChangeLog, User, UserRole, InspectionStatus,
    PokaYokeRecord, ProcessSetupMaster, ProcessSetupRecord, ProcessValidationPlan 
} from '../types';

// --- PERSISTENCE LAYER CONSTANTS ---
const DB_KEYS = {
    USERS: 'EQMS_USERS',
    CONTROL_PLANS: 'EQMS_CONTROL_PLANS',
    CONTROL_PLAN_LOGS: 'EQMS_CP_LOGS',
    INSPECTIONS: 'EQMS_INSPECTIONS',
    NC_RECORDS: 'EQMS_NC_RECORDS',
    INSTRUMENTS: 'EQMS_INSTRUMENTS',
    POKA_YOKE: 'EQMS_POKA_YOKE',
    PROCESS_MASTERS: 'EQMS_PROCESS_MASTERS',
    PROCESS_LOGS: 'EQMS_PROCESS_LOGS',
    VALIDATION_PLANS: 'EQMS_VALIDATION_PLANS',
    SESSION: 'EQMS_CURRENT_SESSION'
};

// --- DATA ACCESS LAYER (DAL) ---

// Helper to load data with fallback
const load = <T>(key: string, defaultVal: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultVal;
    } catch (e) {
        console.error(`Error loading ${key}`, e);
        return defaultVal;
    }
};

// Helper to commit data
const commit = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key}`, e);
        alert("Storage Quota Exceeded! Unable to save data.");
    }
};

// --- STATE INITIALIZATION ---

let USERS: User[] = load(DB_KEYS.USERS, []);
let CONTROL_PLANS: ControlPlan[] = load(DB_KEYS.CONTROL_PLANS, []);
let CONTROL_PLAN_LOGS: ControlPlanChangeLog[] = load(DB_KEYS.CONTROL_PLAN_LOGS, []);
let INSPECTION_LOGS: InspectionRecord[] = load(DB_KEYS.INSPECTIONS, []);
let NC_RECORDS: NCRecord[] = load(DB_KEYS.NC_RECORDS, []);
let INSTRUMENTS: Instrument[] = load(DB_KEYS.INSTRUMENTS, [
    { id: 'INS-001', name: 'Digital Vernier', serialNumber: 'DV-992', lastCalibration: '2023-10-01', frequencyDays: 365, nextDueDate: '2024-10-01', status: 'OK' },
    { id: 'INS-002', name: 'Air Gauge Unit', serialNumber: 'AG-221', lastCalibration: '2024-01-15', frequencyDays: 90, nextDueDate: '2024-04-15', status: 'DUE_SOON' }
]);
let POKA_YOKE_LOGS: PokaYokeRecord[] = load(DB_KEYS.POKA_YOKE, []);
let PROCESS_SETUP_MASTERS: ProcessSetupMaster[] = load(DB_KEYS.PROCESS_MASTERS, []);
let PROCESS_SETUP_LOGS: ProcessSetupRecord[] = load(DB_KEYS.PROCESS_LOGS, []);
let VALIDATION_PLANS: ProcessValidationPlan[] = load(DB_KEYS.VALIDATION_PLANS, []);

// Session is transient in memory for security, but we could persist token here if needed
let CURRENT_USER: User | null = (() => {
    const session = sessionStorage.getItem(DB_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
})();

const SIGNATURE_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAAAyCAYAAAC+jCIaAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABiSURBVHgB7c6xCQAgDAVB91/6rSAYCGIn7sC8x8D+cwEAAGB91j2v52UAAIB1Wfe8npcBAADWZd3zel4GAABYl3XP63kZAABgXdY9r+dlAACAdVn3vJ6XAQAA1mXd83peBgAAWJc105cA1iE0d4IAAAAASUVORK5CYII=";

// --- SEED DATA LOGIC (Run only if empty) ---
const seedData = () => {
    if (USERS.length > 0) return; // DB already exists

    console.log("Seeding Initial Database...");

    // Seed Users
    USERS = [
        { id: 'u1', userCode: 'EMP001', name: 'Rajesh Kumar', email: 'rajesh@texspin.com', password: '123', role: 'INSPECTOR', department: 'Assembly', status: 'ACTIVE' },
        { id: 'u2', userCode: 'EMP002', name: 'Amit Varma', email: 'amit@texspin.com', password: '123', role: 'HOD', department: 'Quality', signatureUrl: SIGNATURE_IMAGE, status: 'ACTIVE' },
        { id: 'u3', userCode: 'ADMIN', name: 'System Admin', email: 'admin@texspin.com', password: 'admin', role: 'ADMIN', department: 'IT', status: 'ACTIVE' }
    ];
    commit(DB_KEYS.USERS, USERS);

    // Seed Control Plan
    if (CONTROL_PLANS.length === 0) {
        const cp: ControlPlan = {
            id: 'temp-1',
            controlPlanNumber: 'TBL/CP/251',
            partNumber: 'ZA28708.2',
            partName: 'TX-3052 SC CLUTCH RELEASE BEARING',
            processFamily: 'Assembly',
            phase: 'PRODUCTION',
            version: 1,
            status: PlanStatus.ACTIVE,
            approvalDate: '2023-10-19',
            coreTeam: 'Mr. Parakram, Mr. Devendra',
            year: 2024,
            items: [
                {
                    id: 'row-1', stepNumber: '13.01', processName: 'Visual Inspection', machineDevice: 'Manually',
                    charNo: 1, productDesc: 'Component Free From Rust, Dent, foreign particle', processDesc: '',
                    specialCharClass: '', tolerance: 'Free From Rust, Dent', evaluationTechnique: 'Visually',
                    sampleSize: '100%', frequency: 'Continuous', controlMethod: 'VA-49/1',
                    reactionPlan: 'Stop machine, inform Prod Engineer', responsibility: 'Assy Supervisor', 
                    isPokaYoke: false, isActive: true, unit: '-'
                },
                {
                    id: 'row-2', stepNumber: '13.31', processName: 'Wave Spring Fitment', machineDevice: 'Hydro-pneumatic Press',
                    charNo: 2, productDesc: 'Radial Displacement Force', processDesc: 'Pressure 50 to 110 kg/cm2',
                    specialCharClass: '9', tolerance: '80 ± 30 N', 
                    nominal: 80, lsl: 50, usl: 110, unit: 'N',
                    evaluationTechnique: 'Semi-automatic machine',
                    sampleSize: '5 Pc', frequency: '2 Pc / 2 hour', controlMethod: 'FPI & In process',
                    reactionPlan: 'Reject/hold the Lot', responsibility: 'QA Engineer', 
                    isPokaYoke: true, isActive: true
                },
                {
                    id: 'row-3', stepNumber: '13.04', processName: 'Grease Filling', machineDevice: 'Automatic M/c',
                    charNo: 2, productDesc: 'Grease Qty', processDesc: 'Pressure 2-4 kg/cm2',
                    specialCharClass: '9', tolerance: '1.7 ± 0.20 g', 
                    nominal: 1.7, lsl: 1.5, usl: 1.9, unit: 'g',
                    evaluationTechnique: 'Weigh scale',
                    sampleSize: '5 pcs', frequency: '2 pc / 2 hour', controlMethod: 'SPC Analysis',
                    reactionPlan: 'Sort out Defective Parts', responsibility: 'QA Engineer', 
                    isPokaYoke: false, isActive: true
                }
            ]
        };
        CONTROL_PLANS.push(cp);
        commit(DB_KEYS.CONTROL_PLANS, CONTROL_PLANS);
    }

    // Seed Process Master
    if (PROCESS_SETUP_MASTERS.length === 0) {
        PROCESS_SETUP_MASTERS.push({
            id: 'pm-1',
            partNumber: 'ZA28708.2',
            machineNo: 'HP-PRESS-01',
            processName: 'Wave Spring Fitment',
            parameters: [
                { id: 'p1', name: 'Hydraulic Pressure', specification: '50 - 110 kg/cm2', class: 'Critical', controlMethod: 'Pressure Gauge' },
                { id: 'p2', name: 'Hold Time', specification: '2 - 4 sec', class: 'Major', controlMethod: 'Timer' },
                { id: 'p3', name: 'Fixture Alignment', specification: 'OK / NOK', class: 'Minor', controlMethod: 'Visual' }
            ]
        });
        commit(DB_KEYS.PROCESS_MASTERS, PROCESS_SETUP_MASTERS);
    }
    
    // Seed Validation Plan
    if (VALIDATION_PLANS.length === 0) {
        const date = new Date();
        const nextDate = new Date();
        nextDate.setMonth(date.getMonth() + 1);
        
        VALIDATION_PLANS.push({
            id: 'val-1',
            partNumber: 'ZA28708.2',
            partName: 'Clutch Release Bearing',
            lineMachineNo: 'Assembly Line 1',
            validationType: 'INITIAL',
            controlPlanRef: 'TBL/CP/251',
            validationDate: date.toISOString().split('T')[0],
            nextDueDate: nextDate.toISOString().split('T')[0],
            frequencyMonths: 1,
            status: InspectionStatus.APPROVED,
            validatedBy: 'Rajesh Kumar',
            approvedBy: 'Amit Varma',
            approvalDate: '2024-02-16',
            approvalRemark: 'Validation Successful. Process Stable.',
            processes: [
                {
                    id: 'proc-1',
                    processName: '10.20 Grease Filling',
                    parameters: [
                        {
                            id: 'param-1', name: 'Grease Weight', specification: '1.5 - 1.9 g', unit: 'g', lsl: 1.5, usl: 1.9,
                            trials: [
                                { id: 't1', trialNo: 1, readings: [1.6, 1.7, 1.65, 1.72, 1.68], observation: 'Within limit', status: 'OK' },
                                { id: 't2', trialNo: 2, readings: [1.55, 1.6, 1.58, 1.62, 1.6], observation: 'Within limit', status: 'OK' }
                            ]
                        }
                    ]
                }
            ]
        });
        commit(DB_KEYS.VALIDATION_PLANS, VALIDATION_PLANS);
    }
};

// Execute Seed
seedData();


// --- AUTHENTICATION ---

export const login = (userCodeOrEmail: string, password: string): User => {
    const user = USERS.find(u => 
        (u.userCode.toUpperCase() === userCodeOrEmail.toUpperCase() || u.email.toUpperCase() === userCodeOrEmail.toUpperCase()) && 
        u.password === password
    );

    if (!user) {
        throw new Error("Invalid User Code or Password");
    }

    if (user.status !== 'ACTIVE') {
        throw new Error("Account is inactive. Contact Administrator.");
    }

    CURRENT_USER = user;
    sessionStorage.setItem(DB_KEYS.SESSION, JSON.stringify(user));
    return user;
};

export const logout = () => {
    CURRENT_USER = null;
    sessionStorage.removeItem(DB_KEYS.SESSION);
};

export const getCurrentUser = (): User => {
    if (!CURRENT_USER) {
        throw new Error("No active session. Please log in.");
    }
    return CURRENT_USER;
};

export const getUserSignature = (userId: string): string | undefined => {
    return USERS.find(u => u.id === userId)?.signatureUrl;
};

// --- USER MANAGEMENT (ADMIN) ---

export const getUsers = (): User[] => {
    return [...USERS];
};

export const saveUser = (user: User): void => {
    const existingIndex = USERS.findIndex(u => u.id === user.id);
    const duplicate = USERS.find(u => (u.userCode === user.userCode || u.email === user.email) && u.id !== user.id);
    if (duplicate) throw new Error("User Code or Email already exists.");

    if (existingIndex >= 0) {
        USERS[existingIndex] = user;
    } else {
        USERS.push(user);
    }
    commit(DB_KEYS.USERS, USERS);
};

export const toggleUserStatus = (id: string): void => {
    const user = USERS.find(u => u.id === id);
    if (user) {
        user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        commit(DB_KEYS.USERS, USERS);
    }
};

const getDiffs = (oldPlan: ControlPlan, newPlan: ControlPlan) => {
    const changes: Array<{ field: string, oldValue: string, newValue: string }> = [];
    if (oldPlan.partName !== newPlan.partName) changes.push({ field: 'Part Name', oldValue: oldPlan.partName, newValue: newPlan.partName });
    if (oldPlan.coreTeam !== newPlan.coreTeam) changes.push({ field: 'Core Team', oldValue: oldPlan.coreTeam, newValue: newPlan.coreTeam });
    if (JSON.stringify(oldPlan.items) !== JSON.stringify(newPlan.items)) {
        changes.push({ field: 'Control Plan Items', oldValue: 'See Version ' + oldPlan.version, newValue: 'Updated in V' + (oldPlan.version + 1) });
    }
    return changes;
};

// --- MODULE 1: CONTROL PLAN ENGINE ---

export const getActiveControlPlan = (partNumber: string, processFamily?: string): ControlPlan | undefined => {
    return CONTROL_PLANS.find(cp => 
        cp.partNumber === partNumber && 
        (!processFamily || cp.processFamily === processFamily) &&
        cp.status === PlanStatus.ACTIVE
    );
};

export const getControlPlanById = (id: string): ControlPlan | undefined => {
    return CONTROL_PLANS.find(cp => cp.id === id);
};

export const getAllControlPlans = (): ControlPlan[] => {
    return CONTROL_PLANS.sort((a, b) => b.version - a.version); 
};

export const getControlPlanLogs = (controlPlanNumber: string): ControlPlanChangeLog[] => {
    return CONTROL_PLAN_LOGS.filter(l => l.controlPlanNumber === controlPlanNumber).sort((a, b) => b.version - a.version);
};

export const saveControlPlan = (draft: ControlPlan, changeReason: string = "Version Update"): void => {
    const existingActive = getActiveControlPlan(draft.partNumber, draft.processFamily);
    let newVersion = 1;
    let changes: any[] = [];

    if (existingActive) {
        existingActive.status = PlanStatus.ARCHIVED;
        newVersion = existingActive.version + 1;
        changes = getDiffs(existingActive, draft);
    } else {
        changes = [{ field: 'Status', oldValue: 'New', newValue: 'Created' }];
    }

    const newPlan: ControlPlan = {
        ...draft,
        id: crypto.randomUUID(),
        version: newVersion,
        status: PlanStatus.ACTIVE,
        approvalDate: new Date().toISOString().split('T')[0],
        year: new Date().getFullYear()
    };

    CONTROL_PLANS.push(newPlan);
    commit(DB_KEYS.CONTROL_PLANS, CONTROL_PLANS);

    const log: ControlPlanChangeLog = {
        id: crypto.randomUUID(),
        controlPlanNumber: newPlan.controlPlanNumber,
        version: newVersion,
        previousVersion: newVersion - 1,
        changedBy: getCurrentUser().name,
        changeDate: new Date().toISOString(),
        changeReason: changeReason,
        changes: changes
    };
    CONTROL_PLAN_LOGS.push(log);
    commit(DB_KEYS.CONTROL_PLAN_LOGS, CONTROL_PLAN_LOGS);
};

export const getUniqueParts = () => {
    return Array.from(new Set(CONTROL_PLANS.map(cp => cp.partNumber)));
};

// --- COMMON APPROVAL HELPERS ---

const handleGenericApproval = (record: any, status: InspectionStatus, remark: string) => {
    const user = getCurrentUser();
    if (user.role !== 'HOD') throw new Error("Permission Denied: Only HOD can perform this action.");
    
    if (record.status !== InspectionStatus.SUBMITTED) {
        throw new Error(`Invalid Transition: Record is currently '${record.status}'. Only SUBMITTED records can be processed.`);
    }

    if (status === InspectionStatus.APPROVED) {
        if (!remark || remark.trim() === '') throw new Error("Approval Remark is mandatory.");
        record.status = InspectionStatus.APPROVED;
        record.approvedBy = user.name;
        record.approverId = user.id;
        record.approvalDate = new Date().toISOString();
        record.approvalRemark = remark;
        record.rejectionRemark = undefined;
    } 
    else if (status === InspectionStatus.REJECTED) {
        if (!remark || remark.trim() === '') throw new Error("Rejection Remark is mandatory.");
        record.status = InspectionStatus.REJECTED;
        record.approvedBy = user.name;
        record.approverId = user.id;
        record.approvalDate = new Date().toISOString();
        record.rejectionRemark = remark;
        // Keep approval remark if any, or clear? Clear is safer to avoid confusion
        record.approvalRemark = undefined; 
    } else {
        throw new Error(`Unsupported Action Status provided: ${status}`);
    }
    return record;
};

// --- MODULE 2: INSPECTION ENGINE ---

export const saveInspection = (record: InspectionRecord): void => {
    const user = getCurrentUser();
    if (user.role !== 'INSPECTOR') throw new Error(`Role Violation: ${user.role} cannot submit inspections.`);

    const safeRecord = JSON.parse(JSON.stringify(record));
    if (!safeRecord.status) safeRecord.status = InspectionStatus.SUBMITTED;

    INSPECTION_LOGS.push(safeRecord);
    commit(DB_KEYS.INSPECTIONS, INSPECTION_LOGS);

    if (safeRecord.overallResult === 'NG') {
        createNC({
            id: crypto.randomUUID(),
            source: 'INSPECTION',
            refId: safeRecord.id,
            partNumber: safeRecord.partNumber,
            processName: `${safeRecord.processFamily} - ${safeRecord.operationStep}`,
            description: `Auto-generated from ${safeRecord.type} Failure. Step: ${safeRecord.operationStep}`,
            detectedDate: new Date().toISOString(),
            status: NCStatus.OPEN
        });
    }
};

export const getInspectionHistory = (partNumber?: string): InspectionRecord[] => {
    const logs = partNumber ? INSPECTION_LOGS.filter(r => r.partNumber === partNumber) : [...INSPECTION_LOGS];
    return logs.reverse();
};

export const getLastInspectionTime = (partNumber: string, processFamily: string, type: string): Date | null => {
    const logs = INSPECTION_LOGS
        .filter(r => r.partNumber === partNumber && r.processFamily === processFamily && r.type === type)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.length > 0 ? new Date(logs[0].timestamp) : null;
};

export const getPendingInspections = (): InspectionRecord[] => {
    const user = getCurrentUser();
    if (user.role.toUpperCase() !== 'HOD') return [];
    return INSPECTION_LOGS.filter(r => r.status === InspectionStatus.SUBMITTED);
};

export const approveInspection = (id: string, status: InspectionStatus, remark?: string) => {
    const record = INSPECTION_LOGS.find(r => r.id === id);
    if (!record) throw new Error("Inspection record not found.");
    const updated = handleGenericApproval(record, status, remark || '');
    commit(DB_KEYS.INSPECTIONS, INSPECTION_LOGS);
    return updated;
};

// --- MODULE 3: NC & CAPA ENGINE ---

export const createNC = (nc: NCRecord): void => {
    NC_RECORDS.push(nc);
    commit(DB_KEYS.NC_RECORDS, NC_RECORDS);
};

export const getNCRecords = (): NCRecord[] => {
    return NC_RECORDS;
};

export const updateNCStatus = (ncId: string, updates: Partial<NCRecord>): void => {
    const nc = NC_RECORDS.find(n => n.id === ncId);
    if (!nc) return;
    if (updates.status === NCStatus.CLOSED && !nc.effectivenessVerified && !updates.effectivenessVerified) {
        throw new Error("Cannot close NC without Effectiveness Verification.");
    }
    Object.assign(nc, updates);
    commit(DB_KEYS.NC_RECORDS, NC_RECORDS);
};

// --- MODULE 4: POKA YOKE ENGINE ---

export const savePokaYoke = (record: PokaYokeRecord): void => {
    // Set initial status to SUBMITTED
    record.status = InspectionStatus.SUBMITTED;
    POKA_YOKE_LOGS.push(record);
    commit(DB_KEYS.POKA_YOKE, POKA_YOKE_LOGS);
    
    // Auto NC
    if (record.verifications.some(v => v.status === 'NG')) {
        createNC({
            id: crypto.randomUUID(),
            source: 'POKA_YOKE',
            partNumber: record.partNumber,
            processName: `Poka Yoke - ${record.machineNo}`,
            description: `Poka Yoke Verification Failed on ${record.date}. Check: ${record.verifications.find(v=>v.status==='NG')?.checkPoint}`,
            detectedDate: new Date().toISOString(),
            status: NCStatus.OPEN
        });
    }
};

export const getPokaYokeHistory = () => {
    return POKA_YOKE_LOGS.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPendingPokaYokes = (): PokaYokeRecord[] => {
    const user = getCurrentUser();
    if (user.role.toUpperCase() !== 'HOD') return [];
    return POKA_YOKE_LOGS.filter(r => r.status === InspectionStatus.SUBMITTED);
};

export const approvePokaYoke = (id: string, status: InspectionStatus, remark: string) => {
    const record = POKA_YOKE_LOGS.find(r => r.id === id);
    if (!record) throw new Error("Poka Yoke record not found.");
    
    // Specific Business Rule: Block Approval if NG
    if (status === InspectionStatus.APPROVED) {
        const hasNG = record.verifications.some(v => v.status === 'NG');
        if (hasNG) throw new Error("Cannot Approve: Poka-Yoke verification has NG checkpoints. Reject or fix.");
    }

    const updated = handleGenericApproval(record, status, remark);
    commit(DB_KEYS.POKA_YOKE, POKA_YOKE_LOGS);
    return updated;
};

// --- MODULE 5: PROCESS APPROVAL ENGINE ---

export const getProcessMaster = (partNumber: string): ProcessSetupMaster | undefined => {
    return PROCESS_SETUP_MASTERS.find(m => m.partNumber === partNumber);
};

export const saveProcessMaster = (master: ProcessSetupMaster) => {
    const existingIdx = PROCESS_SETUP_MASTERS.findIndex(m => m.partNumber === master.partNumber);
    if (existingIdx >= 0) {
        PROCESS_SETUP_MASTERS[existingIdx] = master;
    } else {
        PROCESS_SETUP_MASTERS.push(master);
    }
    commit(DB_KEYS.PROCESS_MASTERS, PROCESS_SETUP_MASTERS);
};

export const saveProcessSetupRecord = (record: ProcessSetupRecord) => {
    record.status = InspectionStatus.SUBMITTED;
    PROCESS_SETUP_LOGS.push(record);
    commit(DB_KEYS.PROCESS_LOGS, PROCESS_SETUP_LOGS);
};

export const getProcessSetupHistory = () => {
    return PROCESS_SETUP_LOGS.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPendingProcessSetups = (): ProcessSetupRecord[] => {
    const user = getCurrentUser();
    if (user.role.toUpperCase() !== 'HOD') return [];
    return PROCESS_SETUP_LOGS.filter(r => r.status === InspectionStatus.SUBMITTED);
};

export const approveProcessSetup = (id: string, status: InspectionStatus, remark: string) => {
    const record = PROCESS_SETUP_LOGS.find(r => r.id === id);
    if (!record) throw new Error("Process Setup record not found.");
    
    const updated = handleGenericApproval(record, status, remark);
    commit(DB_KEYS.PROCESS_LOGS, PROCESS_SETUP_LOGS);
    return updated;
};

// --- MODULE 6: PROCESS VALIDATION (UPDATED) ---

const calculateNextDueDate = (dateStr: string, months: number): string => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
};

export const saveValidationPlan = (plan: ProcessValidationPlan) => {
    // ENFORCED ROLE CHECK
    const user = getCurrentUser();
    if (user.role !== 'INSPECTOR') {
        throw new Error("Permission Denied: Only Inspectors can create/submit Process Validations.");
    }

    const freq = plan.frequencyMonths || 1;
    plan.frequencyMonths = freq;
    plan.nextDueDate = calculateNextDueDate(plan.validationDate, freq);
    plan.status = InspectionStatus.SUBMITTED; // Force SUBMITTED
    
    VALIDATION_PLANS.push(plan);
    commit(DB_KEYS.VALIDATION_PLANS, VALIDATION_PLANS);
};

export const getValidationPlans = () => {
    return VALIDATION_PLANS.sort((a,b) => new Date(b.validationDate).getTime() - new Date(a.validationDate).getTime());
};

export const getPendingValidations = (): ProcessValidationPlan[] => {
    const user = getCurrentUser();
    if (user.role.toUpperCase() !== 'HOD') return [];
    return VALIDATION_PLANS.filter(r => r.status === InspectionStatus.SUBMITTED);
};

export const approveValidationPlan = (id: string, status: InspectionStatus, remark: string) => {
    const plan = VALIDATION_PLANS.find(p => p.id === id);
    if (!plan) throw new Error("Validation Plan not found.");

    // Rule: Approval allowed only if All trials OK
    if (status === InspectionStatus.APPROVED) {
        let hasNG = false;
        plan.processes.forEach(proc => {
            proc.parameters.forEach(param => {
                if(param.trials.some(t => t.status === 'NG')) hasNG = true;
            })
        });
        if (hasNG) throw new Error("Cannot Approve: One or more Validation Trials are NG. Please review.");
    }

    const updated = handleGenericApproval(plan, status, remark);
    commit(DB_KEYS.VALIDATION_PLANS, VALIDATION_PLANS);
    return updated;
};

export const getValidationStatus = (plan: ProcessValidationPlan): 'VALID' | 'DUE_SOON' | 'OVERDUE' => {
    if (plan.status !== InspectionStatus.APPROVED) return 'VALID'; // Only active plans degrade
    const today = new Date();
    const dueDate = new Date(plan.nextDueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'OVERDUE';
    if (diffDays <= 7) return 'DUE_SOON';
    return 'VALID';
};

export const getValidationAnalytics = () => {
    const total = VALIDATION_PLANS.length;
    let overdue = 0;
    let dueSoon = 0;
    let valid = 0;
    const processCounts: Record<string, {total: number, overdue: number}> = {};

    VALIDATION_PLANS.forEach(p => {
        const status = getValidationStatus(p);
        if (status === 'OVERDUE') overdue++;
        else if (status === 'DUE_SOON') dueSoon++;
        else valid++;

        const mainProcess = p.processes.length > 0 ? p.processes[0].processName : 'Unknown';
        if (!processCounts[mainProcess]) processCounts[mainProcess] = { total: 0, overdue: 0 };
        processCounts[mainProcess].total++;
        if (status === 'OVERDUE') processCounts[mainProcess].overdue++;
    });

    const chartData = Object.keys(processCounts).map(key => ({
        name: key,
        Total: processCounts[key].total,
        Overdue: processCounts[key].overdue
    }));

    return { total, overdue, dueSoon, valid, chartData };
};

// --- MODULE 7: CALIBRATION ---

export const getInstruments = (): Instrument[] => {
    const today = new Date();
    return INSTRUMENTS.map(inst => {
        const nextDate = new Date(inst.nextDueDate);
        const diffTime = nextDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let status: 'OK' | 'DUE_SOON' | 'OVERDUE' = 'OK';
        if (diffDays < 0) status = 'OVERDUE';
        else if (diffDays < 7) status = 'DUE_SOON';
        return { ...inst, status };
    });
};

export const getPPMData = () => {
    return [
        { name: 'Jan', ppm: 1200 },
        { name: 'Feb', ppm: 850 },
        { name: 'Mar', ppm: 2100 },
        { name: 'Apr', ppm: 450 },
        { name: 'May', ppm: 900 },
    ];
};
