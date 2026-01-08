import { createClient } from '@supabase/supabase-js';

// Use environment variables for configuration with safe access
// We access import.meta.env safely to prevent crashes if it's undefined
const env = (import.meta as any).env || {};

// User provided credentials for TEXSPIN e-QMS
const PROVIDED_URL = "https://oeobstjqjxejijgumhgs.supabase.co";
const PROVIDED_KEY = "sb_publishable_o9F1PJtvbgzbbyoPditrfA_e3zyArmq";

const SUPABASE_URL = env.VITE_SUPABASE_URL || PROVIDED_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || PROVIDED_KEY;

// Initialize client with fallback to prevent immediate crash if env vars are missing
// The isSupabaseConfigured check in App.tsx will prevent actual usage if these are empty
export const supabase = createClient(
    SUPABASE_URL, 
    SUPABASE_KEY
);

export const isSupabaseConfigured = () => {
    return SUPABASE_URL.length > 0 && 
           SUPABASE_KEY.length > 0 && 
           SUPABASE_URL.startsWith('https');
};