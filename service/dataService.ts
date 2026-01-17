
import { AppSettings } from '../types';
import { supabase } from './supabaseClient';

export const DEFAULT_SETTINGS: AppSettings = {
    driverShortDistanceLimit: 30,
    driverShortDistancePrice: 150000,
    driverLongDistanceLimit: 600,
    driverLongDistancePrice: 500000,
    driverOvernightPrice: 150000, // Default 150rb per malam
    agentMarkupValue: 10,
    agentMarkupType: 'Percent',
    customerMarkupValue: 25,
    customerMarkupType: 'Percent',
    fuelTypes: [
        { name: 'Pertalite', price: 10000, category: 'Gasoline' },
        { name: 'Pertamax', price: 13500, category: 'Gasoline' },
        { name: 'Solar', price: 6800, category: 'Gasoil' },
        { name: 'Dexlite', price: 15000, category: 'Gasoil' },
    ],
    tollRates: [
        { id: '1', name: 'Waru - Juanda', price: 9000 },
        { id: '2', name: 'Waru - Sidoarjo', price: 6000 },
        { id: '3', name: 'Sidoarjo - Porong', price: 6000 },
        { id: '4', name: 'Surabaya - Malang', price: 35000 },
    ],
    // Defaults for new fields
    companyName: 'ASPERDA Rental',
    logoUrl: '',
    themeColor: 'blue',
    darkMode: false,
    
    // Global Defaults
    globalLogoUrl: '/logo-asperda-surabaya.png',
    globalBackgroundUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470&auto=format&fit=crop',
    
    // Auth Page Customization Defaults
    authTitle: 'ASPERDA | SURABAYA',
    authSubtitle: 'Sistem Manajemen Asosiasi Rental Daerah',
    authQuote: '"Platform digital terintegrasi untuk menghubungkan dan memberdayakan pengusaha rental mobil profesional di seluruh Indonesia."',

    carCategories: ['MPV', 'SUV', 'Sedan', 'Luxury', 'Bus'],
    rentalPackages: ['12 Jam (Dalam Kota)', '24 Jam (Dalam Kota)', 'Full Day (Luar Kota)'],
    
    coverageAreas: [
        { id: '1', name: 'Wilayah 1', description: 'Jawa Timur - Kota Kota (Exc. Banyuwangi/Pacitan)', extraPrice: 0, extraDriverPrice: 0 },
        { id: '2', name: 'Wilayah 2', description: 'Jawa Tengah & Banyuwangi, Pacitan, Sumenep', extraPrice: 300000, extraDriverPrice: 200000 },
        { id: '3', name: 'Wilayah 3', description: 'Jawa Barat, Jakarta, Banten, Bali', extraPrice: 400000, extraDriverPrice: 300000 },
        { id: '4', name: 'Wilayah 4', description: 'Palembang, Sumbawa, Lombok, Lampung', extraPrice: 500000, extraDriverPrice: 400000 },
    ],

    gpsProvider: 'Simulation'
};

export const getStoredData = <T>(key: string, defaultValue: T): T => {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try {
        return JSON.parse(stored);
    } catch {
        return defaultValue;
    }
};

export const setStoredData = <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const generateDummyData = async () => {
    console.log("Generating dummy data...");
    // Future implementation: Insert sample cars, bookings, etc.
    alert("Fitur generate dummy data akan tersedia setelah koneksi backend stabil.");
};

export const clearAllData = async () => {
    console.log("Clearing all data...");
    const { error: e1 } = await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: e2 } = await supabase.from('cars').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: e3 } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: e4 } = await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: e5 } = await supabase.from('finance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (e1 || e2 || e3 || e4 || e5) {
        throw new Error("Gagal menghapus sebagian data. Cek permission.");
    }
};

// Utility to merge lists (e.g. imported cars)
export const mergeData = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const map = new Map(existing.map(i => [i.id, i]));
    incoming.forEach(i => map.set(i.id, i));
    return Array.from(map.values());
};

// Export to CSV
export const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => typeof v === 'string' ? `"${v}"` : JSON.stringify(v)).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const processCSVImport = (file: File, callback: (data: any[]) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if(!text) return;
        
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const result = [];
        
        for(let i=1; i<lines.length; i++) {
            if(!lines[i].trim()) continue;
            const currentline = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '')); // Basic CSV parse
            const obj: any = {};
            for(let j=0; j<headers.length; j++) {
                obj[headers[j]] = currentline[j];
            }
            result.push(obj);
        }
        callback(result);
    };
    reader.readAsText(file);
};
