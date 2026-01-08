
// Data Governance: Cloud Native (Supabase)

export enum PlanStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    DRAFT = 'DRAFT'
}

// Updated Roles based on new requirements
export type UserRole = 'ADMIN' | 'PRODUCTION' | 'QUALITY' | 'VIEW_ONLY' | 'INSPECTOR' | 'HOD';

export interface User {
    id: string; // Supabase Auth ID
    userCode: string; // Email or Employee ID
    name: string;
    email: string;
    role: UserRole;
    department: string;
    status: 'ACTIVE' | 'INACTIVE';
    signatureUrl?: string; 
}

// --- NEW MODULES ---

export interface PartMaster {
    part_no: string;
    part_name: string;
    part_value: number;
}

export interface ProductionEntry {
    id?: number;
    date: string;
    department: string;
    part_no: string;
    part_name: string;
    part_value: number;
    quantity: number;
    created_by?: string;
    created_at?: string;
}

// --- LEGACY INTERFACES (Kept for compatibility) ---

export enum InspectionStatus {
    DRAFT = 'DRAFT', 
    SUBMITTED = 'SUBMITTED', 
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export interface ControlPlanItem {
    id: string;
    stepNumber: string; 
    processName: string; 
    machineDevice: string; 
    charNo: number; 
    productDesc: string; 
    processDesc: string; 
    specialCharClass: string; 
    tolerance: string; 
    nominal?: number;
    lsl?: number;
    usl?: number;
    unit?: string; 
    evaluationTechnique: string; 
    sampleSize: string; 
    frequency: string; 
    controlMethod: string; 
    reactionPlan: string; 
    responsibility: string; 
    isPokaYoke: boolean;
    isActive: boolean;
}

export interface ControlPlan {
    id: string;
    controlPlanNumber: string; 
    partNumber: string; 
    partName: string; 
    processFamily: string; 
    phase: 'PROTOTYPE' | 'PRE-LAUNCH' | 'PRODUCTION';
    version: number;
    status: PlanStatus;
    approvalDate: string;
    coreTeam: string; 
    items: ControlPlanItem[];
    year: number;
}

export interface ControlPlanChangeLog {
    id: string;
    controlPlanNumber: string;
    version: number;
    previousVersion: number;
    changedBy: string;
    changeDate: string;
    changeReason: string;
    changes: Array<{
        field: string;
        oldValue: string;
        newValue: string;
    }>;
}

export interface InspectionRecord {
    id: string;
    controlPlanId: string;
    partNumber: string;
    processFamily: string; 
    operationStep: string; 
    type: 'FIRST_PART' | 'PATROL' | 'LAST_PART' | 'PRE_DISPATCH';
    inspectorName: string;
    inspectorId: string;
    timestamp: string;
    status: InspectionStatus;
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string; 
    rejectionRemark?: string;
    readings: Record<string, {
        values: (number | null)[]; 
        textValue?: string; 
        result: 'OK' | 'NG';
        remark?: string; 
        specSnapshot: string; 
    }>;
    overallResult: 'OK' | 'NG';
    year: number;
}

export enum NCStatus {
    OPEN = 'OPEN',
    RCA_SUBMITTED = 'RCA_SUBMITTED',
    ACTION_IMPLEMENTED = 'ACTION_IMPLEMENTED',
    VERIFIED = 'VERIFIED',
    CLOSED = 'CLOSED'
}

export interface NCRecord {
    id: string;
    source: 'INSPECTION' | 'AUDIT' | 'CUSTOMER' | 'MANUAL' | 'POKA_YOKE' | 'PROCESS_VALIDATION';
    refId?: string; 
    partNumber: string;
    processName: string;
    description: string;
    detectedDate: string;
    status: NCStatus;
    rootCause?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    responsibility?: string;
    targetDate?: string;
    effectivenessVerified?: boolean;
    verificationDate?: string;
}

export interface Instrument {
    id: string;
    name: string;
    serialNumber: string;
    lastCalibration: string;
    frequencyDays: number;
    nextDueDate: string;
    status: 'OK' | 'DUE_SOON' | 'OVERDUE';
}

export interface PokaYokeRecord {
    id: string;
    date: string;
    shift: 'A' | 'B' | 'C';
    partNumber: string;
    machineNo: string;
    controlPlanId: string;
    verifications: Array<{
        cpItemId: string;
        checkPoint: string; 
        method: string; 
        spec: string; 
        actualObservation: string; 
        status: 'OK' | 'NG';
    }>;
    verifiedBy: string; 
    status: InspectionStatus; 
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string;
    rejectionRemark?: string;
    supervisorName?: string; 
}

export interface ProcessSetupMaster {
    id: string;
    partNumber: string;
    machineNo: string;
    processName: string; 
    parameters: Array<{
        id: string;
        name: string; 
        specification: string; 
        class: string; 
        controlMethod: string; 
    }>;
}

export interface ProcessSetupRecord {
    id: string;
    masterId: string;
    date: string;
    shift: 'A' | 'B' | 'C';
    checkedBy: string; 
    status: InspectionStatus; 
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string;
    rejectionRemark?: string;
    remarks?: string;
    readings: Record<string, { 
        actualValue: string;
        status: 'OK' | 'NG';
    }>;
}

export interface ValidationTrial {
    id: string;
    trialNo: number;
    readings: [number | null, number | null, number | null, number | null, number | null];
    observation: string;
    status: 'OK' | 'NG';
    remarks?: string;
}

export interface ValidationParameter {
    id: string;
    name: string; 
    specification: string; 
    unit: string;
    lsl?: number;
    usl?: number;
    trials: ValidationTrial[];
}

export interface ValidationProcess {
    id: string;
    processName: string; 
    parameters: ValidationParameter[];
}

export interface ProcessValidationPlan {
    id: string;
    partNumber: string;
    partName: string;
    lineMachineNo: string;
    validationType: 'INITIAL' | 'RE-VALIDATION';
    controlPlanRef: string;
    validationDate: string;
    frequencyMonths: number; 
    nextDueDate: string; 
    processes: ValidationProcess[];
    validatedBy: string;
    status: InspectionStatus; 
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string;
    rejectionRemark?: string;
}
