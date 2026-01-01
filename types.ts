
// Data Governance: No Delete, Versioning, Year-wise storage concepts apply here

export enum PlanStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    DRAFT = 'DRAFT'
}

export type UserRole = 'ADMIN' | 'INSPECTOR' | 'HOD';

export interface User {
    id: string;
    userCode: string; // Employee ID / Unique Code
    name: string;
    email: string;
    password: string; // Encrypted in real app, plain for mock
    role: UserRole;
    department: string;
    status: 'ACTIVE' | 'INACTIVE';
    signatureUrl?: string; // Base64 string
}

export enum InspectionStatus {
    DRAFT = 'DRAFT', // Work in progress
    SUBMITTED = 'SUBMITTED', // Pending HOD
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

// Corresponds to a specific "Operation" row or group of rows in the PDF (e.g., 13.01 Visual Inspection)
export interface ControlPlanItem {
    id: string;
    stepNumber: string; // e.g., "13.01"
    processName: string; // e.g., "Visual Inspection"
    machineDevice: string; // e.g., "Manually", "Hydro-pneumatic Press"
    
    // Characteristics
    charNo: number; // e.g., 1, 2
    productDesc: string; // e.g., "Component Free From Rust"
    processDesc: string; // e.g., "Without Load WI-266"
    specialCharClass: string; // e.g., "9", "Tc", "Tf"
    
    // Specification / Tolerance (Text for display)
    tolerance: string; // e.g., "80 ± 30 N", "Free from Rust"
    
    // Numeric Limits for Auto-Judgment (Optional)
    nominal?: number;
    lsl?: number;
    usl?: number;
    unit?: string; // NEW: Explicit Unit (e.g., "mm", "N", "kg")
    
    // Methods
    evaluationTechnique: string; // e.g., "Visually", "Semi-automatic machine"
    sampleSize: string; // e.g., "100%", "5 Pc"
    frequency: string; // e.g., "Continuous", "1/Hour", "Per Shift"
    controlMethod: string; // e.g., "VA-49/1", "FPI"
    
    // Reaction & Responsibility
    reactionPlan: string; // e.g., "Stop machine, Inform Supervisor"
    responsibility: string; // e.g., "QA Engineer"
    
    // Flags
    isPokaYoke: boolean;
    isActive: boolean;
}

export interface ControlPlan {
    id: string;
    controlPlanNumber: string; // e.g., "TBL/CP/251"
    partNumber: string; // e.g., "ZA28708.2"
    partName: string; // e.g., "TX-3052 SC CLUTCH RELEASE BEARING"
    processFamily: string; // e.g., "Assembly", "Grinding", "Heat Treatment"
    phase: 'PROTOTYPE' | 'PRE-LAUNCH' | 'PRODUCTION';
    
    version: number;
    status: PlanStatus;
    approvalDate: string;
    coreTeam: string; // e.g., "Mr. Parakram, Mr. Devendra"
    
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
    processFamily: string; // e.g. "Assembly"
    operationStep: string; // e.g. "13.04 Grease Filling" - Specific step executed
    type: 'FIRST_PART' | 'PATROL' | 'LAST_PART' | 'PRE_DISPATCH';
    inspectorName: string;
    inspectorId: string;
    timestamp: string;
    
    // Status & Approval
    status: InspectionStatus;
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string; // Added for mandatory approval comments
    rejectionRemark?: string;
    
    // Readings now store complex object to allow one-off spec changes and remarks
    readings: Record<string, {
        values: (number | null)[]; // Numeric readings if applicable, null if empty
        textValue?: string; // For visual/text attributes
        result: 'OK' | 'NG';
        remark?: string; // User remark for deviation/override
        specSnapshot: string; // Snapshot of spec at time of inspection
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
    refId?: string; // Links to InspectionRecord ID
    partNumber: string;
    processName: string;
    description: string;
    detectedDate: string;
    status: NCStatus;
    
    // CAPA Fields
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

// --- MODULE 1: POKA-YOKE ---
export interface PokaYokeRecord {
    id: string;
    date: string;
    shift: 'A' | 'B' | 'C';
    partNumber: string;
    machineNo: string;
    controlPlanId: string;
    
    // Verification Items (Linked to CP Items where isPokaYoke = true)
    verifications: Array<{
        cpItemId: string;
        checkPoint: string; // From CP Product/Process Desc
        method: string; // From CP Control Method
        spec: string; // From CP Tolerance
        actualObservation: string;
        status: 'OK' | 'NG';
    }>;
    
    verifiedBy: string; // Operator
    
    // Standard Approval Fields
    status: InspectionStatus; // Replaces supervisorStatus
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string;
    rejectionRemark?: string;
    
    supervisorName?: string; // Legacy/Display
}

// --- MODULE 2: PROCESS APPROVAL CHECK SHEET ---
// This defines the "Standard" for a process approval (Master)
export interface ProcessSetupMaster {
    id: string;
    partNumber: string;
    machineNo: string;
    processName: string; // e.g. "Heat Treatment"
    parameters: Array<{
        id: string;
        name: string; // e.g. "Temperature", "Pressure"
        specification: string; // e.g. "850 ± 10 °C"
        class: string; // e.g. "Critical", "Major"
        controlMethod: string; // e.g. "Digital Controller"
    }>;
}

// This defines the daily entry (Transaction)
export interface ProcessSetupRecord {
    id: string;
    masterId: string;
    date: string;
    shift: 'A' | 'B' | 'C';
    checkedBy: string; // Production
    
    // Standard Approval Fields
    status: InspectionStatus; // Unified Status
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string;
    rejectionRemark?: string;

    remarks?: string;
    readings: Record<string, { // Keyed by parameter ID
        actualValue: string;
        status: 'OK' | 'NG';
    }>;
}

// --- MODULE 3: PROCESS VALIDATION (SC VALIDATION) - REFINED ---

export interface ValidationTrial {
    id: string;
    trialNo: number;
    // Shop floor requirement: 5 readings (M1-M5) per trial
    readings: [number | null, number | null, number | null, number | null, number | null];
    observation: string;
    status: 'OK' | 'NG';
    remarks?: string;
}

export interface ValidationParameter {
    id: string;
    name: string; // e.g. "Grease Weight"
    specification: string; // e.g. "1.5 - 1.9 g"
    unit: string;
    lsl?: number;
    usl?: number;
    trials: ValidationTrial[];
}

export interface ValidationProcess {
    id: string;
    processName: string; // e.g. "10.20 Grease Filling"
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
    
    // Re-Validation Logic
    frequencyMonths: number; // Default 1
    nextDueDate: string; // Auto-calculated

    // Hierarchy: Report -> Processes -> Parameters -> Trials
    processes: ValidationProcess[];

    validatedBy: string;
    
    // Standard Approval Fields
    status: InspectionStatus; // Unified Status
    approvedBy?: string;
    approverId?: string;
    approvalDate?: string;
    approvalRemark?: string;
    rejectionRemark?: string;
}
