
import { supabase } from './supabaseClient';
import { PartMaster, ProductionEntry, User, UserRole } from '../types';

// NOTE: Ensure your Supabase database has the required tables created.
// Refer to the 'supabase_schema.sql' file in the project root for the creation script.

// --- NEW MODULES: PARTS & PRODUCTION ---

export const getPartsMaster = async (): Promise<PartMaster[]> => {
    const { data, error } = await supabase.from('parts_master').select('*');
    if (error) {
        console.error("Error fetching parts_master:", error);
        throw new Error(error.message);
    }
    return data || [];
};

export const upsertPartMaster = async (part: PartMaster): Promise<void> => {
    const { error } = await supabase.from('parts_master').upsert(part);
    if (error) throw new Error(error.message);
};

export const bulkUpsertParts = async (parts: PartMaster[]): Promise<void> => {
    const { error } = await supabase.from('parts_master').upsert(parts);
    if (error) throw new Error(error.message);
};

export const getProductionEntries = async (): Promise<ProductionEntry[]> => {
    const { data, error } = await supabase
        .from('production_entry')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching production_entry:", error);
        throw new Error(error.message);
    }
    return data || [];
};

export const saveProductionEntry = async (entry: Omit<ProductionEntry, 'id' | 'created_at'>): Promise<void> => {
    const { error } = await supabase.from('production_entry').insert(entry);
    if (error) throw new Error(error.message);
};

// --- LEGACY MODULES ADAPTER (App Documents Table) ---
// This allows the existing EQMS modules to function in the cloud by storing data as JSON

export const initializeDatabase = async () => {
    // No-op for cloud, checking connection handled in App.tsx
    console.log("Cloud Adapter Initialized");
};

export const getAll = async <T>(collectionName: string): Promise<T[]> => {
    // Legacy documents are still stored here
    const { data, error } = await supabase
        .from('app_documents')
        .select('data')
        .eq('collection', collectionName);
    
    if (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        // We return empty array to prevent crashing UI if table is missing or query fails, 
        // but log the error for debugging.
        return [];
    }
    return (data || []).map(row => row.data);
};

export const saveRecord = async (collectionName: string, record: any): Promise<void> => {
    if (!record.id) record.id = crypto.randomUUID();
    
    const { error } = await supabase.from('app_documents').upsert({
        collection: collectionName,
        doc_id: record.id,
        data: record,
        updated_at: new Date().toISOString()
    });

    if (error) throw new Error(error.message);
};

export const deleteRecord = async (collectionName: string, id: string): Promise<void> => {
    const { error } = await supabase
        .from('app_documents')
        .delete()
        .match({ collection: collectionName, doc_id: id });
        
    if (error) throw new Error(error.message);
};

export const isDbReady = () => true;
export const isCloudActive = () => true;

// --- USER & AUTH HELPERS ---

export const getCurrentUserRole = async (): Promise<UserRole> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'VIEW_ONLY';
    
    // We try to get the role from app_users first, else metadata
    const { data } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', user.id)
        .single();
        
    if (data) return data.role as UserRole;

    return (user.user_metadata?.role as UserRole) || 'VIEW_ONLY';
};
