
// LOCAL SERVER CONFIGURATION
export const DB_CONFIG = {
    // Use 127.0.0.1 instead of localhost to prevent Windows IPv6 lookup issues
    apiUrl: "http://127.0.0.1:3001/api",
    apiKey: "LOCAL" 
};

// Always return true to bypass the Setup Screen
export const isCloudEnabled = () => {
    return true; 
};

export const saveDbConfig = () => {
    console.warn("Config is managed via server.js in Local Mode");
};

export const clearDbConfig = () => {
    console.warn("Cannot clear config in Local Mode");
};
