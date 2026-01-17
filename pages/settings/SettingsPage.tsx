
import React, { useState, useEffect } from 'react';
import { User, AppSettings, FuelType, TollRate, UserRole, Partner, Driver, CoverageArea, CoopMember } from '../../types';
import { getStoredData, setStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { authService } from '../../service/authService';
import { coopService } from '../../service/coopService';
import { Save, RefreshCw, Trash2, Moon, Sun, Monitor, Fuel, MapPin, DollarSign, Users, Plus, X, Edit2, Tag, Package, Building, CheckCircle, CreditCard, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../../components/ImageUploader';

export const SettingsPage: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isSaving, setIsSaving] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'general' | 'auth_layout' | 'business' | 'coverage' | 'system' | 'users' | 'coop'>('general');

    // User Management State
    const [usersList, setUsersList] = useState<User[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    // User Form
    const [uName, setUName] = useState('');
    const [uRole, setURole] = useState<UserRole>(UserRole.ADMIN);
    const [uPhone, setUPhone] = useState('');
    const [uEmail, setUEmail] = useState('');

    // New Input States for Business Tab
    const [newCategory, setNewCategory] = useState('');
    const [newPackage, setNewPackage] = useState('');
    
    // Fuel Form
    const [newFuelName, setNewFuelName] = useState('');
    const [newFuelPrice, setNewFuelPrice] = useState(10000);
    const [newFuelCat, setNewFuelCat] = useState<'Gasoline' | 'Gasoil' | 'Electric'>('Gasoline');

    // Toll Form
    const [newTollName, setNewTollName] = useState('');
    const [newTollPrice, setNewTollPrice] = useState(5000);

    // Coverage Area Form
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaDesc, setNewAreaDesc] = useState('');
    const [newAreaRentPrice, setNewAreaRentPrice] = useState(0);
    const [newAreaDriverPrice, setNewAreaDriverPrice] = useState(0);

    // --- KOPERASI STATE ---
    const [myMembership, setMyMembership] = useState<CoopMember | null>(null);
    const [loadingCoop, setLoadingCoop] = useState(false);
    const [pendingMembers, setPendingMembers] = useState<CoopMember[]>([]);
    // Registration Form
    const [regFullName, setRegFullName] = useState('');
    const [regAddress, setRegAddress] = useState('');
    const [regCity, setRegCity] = useState('');
    const [regPhoto, setRegPhoto] = useState<string | null>(null);
    const [regFile, setRegFile] = useState<File | null>(null);
    // Approval
    const [approvalId, setApprovalId] = useState<string | null>(null);
    const [newMemberIdInput, setNewMemberIdInput] = useState('');

    const isOwner = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.DPC_ADMIN;
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const isDpcAdmin = currentUser?.role === UserRole.DPC_ADMIN;

    useEffect(() => {
        // Load Settings
        const loaded = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
        setSettings({ ...DEFAULT_SETTINGS, ...loaded });

        // Load Current User
        authService.getUserProfile().then(p => {
            if(p) {
                setCurrentUser({ id: p.id, name: p.full_name, username: p.email, role: p.role, email: p.email });
                setRegFullName(p.full_name); // Pre-fill name
            }
        });
    }, []);

    useEffect(() => {
        if (isOwner) {
            authService.getUsers().then(data => setUsersList(data));
        }
    }, [isOwner, activeTab]);

    // Load Coop Data when tab active
    useEffect(() => {
        if (activeTab === 'coop') {
            loadCoopData();
        }
    }, [activeTab]);

    const loadCoopData = async () => {
        setLoadingCoop(true);
        try {
            // 1. Get My Membership
            const myMem = await coopService.getMyMembership();
            setMyMembership(myMem);

            // 2. If DPC Admin, get pending approvals
            if (isDpcAdmin) {
                const pendings = await coopService.getPendingMembers();
                setPendingMembers(pendings);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingCoop(false);
        }
    };

    const handleCoopRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingCoop(true);
        try {
            const dpcId = await coopService.getMyDpcId();
            if(!dpcId) throw new Error("Anda belum terhubung ke wilayah DPC manapun.");

            await coopService.registerSelf({
                full_name: regFullName,
                address: regAddress,
                city: regCity,
                username: currentUser?.username || 'user',
                dpc_id: dpcId,
                gender: 'Laki-laki', // Default, should extend form
                join_date: new Date().toISOString().split('T')[0],
                department: 'ANGGOTA',
                photo_url: regPhoto || undefined
            }, regFile);
            
            alert("Pendaftaran berhasil! Menunggu verifikasi pengurus.");
            loadCoopData();
        } catch (e: any) {
            alert("Gagal mendaftar: " + e.message);
        } finally {
            setLoadingCoop(false);
        }
    };

    const handleApproveMember = async (id: string) => {
        if(!newMemberIdInput) {
            alert("Masukkan ID Anggota baru.");
            return;
        }
        if(!window.confirm("Setujui anggota ini?")) return;

        try {
            await coopService.approveMember(id, newMemberIdInput);
            setApprovalId(null);
            setNewMemberIdInput('');
            loadCoopData(); // Reload list
        } catch(e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleChange = (field: keyof AppSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);
        setStoredData('appSettings', settings);
        setTimeout(() => {
            setIsSaving(false);
            window.location.reload(); 
        }, 1000);
    };

    // --- USER MANAGEMENT HANDLERS ---
    const openUserModal = (user?: User) => {
        if (user) {
            setUName(user.name);
            setURole(user.role);
            setUPhone(user.phone || '');
            setUEmail(user.email || '');
        } else {
            setUName('');
            setURole(UserRole.ADMIN);
            setUPhone('');
            setUEmail('');
        }
        setIsUserModalOpen(true);
    };

    const handleDeleteUser = async (id: string) => { 
        if(window.confirm('Hapus user ini?')) {
            try {
                await authService.deleteUser(id);
                setUsersList(prev => prev.filter(u => u.id !== id));
            } catch(e: any) {
                alert("Gagal hapus: " + e.message);
            }
        }
    };

    // Helper for List Items
    const addListItem = (field: keyof AppSettings, value: string, resetFn: (s: string) => void) => {
        if (!value.trim()) return;
        const currentList = (settings[field] as string[]) || [];
        handleChange(field, [...currentList, value]);
        resetFn('');
    };

    const removeListItem = (field: keyof AppSettings, index: number) => {
        const currentList = (settings[field] as string[]) || [];
        const updated = [...currentList];
        updated.splice(index, 1);
        handleChange(field, updated);
    };

    // Helper for Object Lists
    const addFuelType = () => {
        if(!newFuelName || newFuelPrice <= 0) return;
        const newFuel: FuelType = { name: newFuelName, price: newFuelPrice, category: newFuelCat };
        const updated = [...(settings.fuelTypes || []), newFuel];
        handleChange('fuelTypes', updated);
        setNewFuelName(''); 
        setNewFuelPrice(10000);
    };

    const removeFuelType = (index: number) => {
        const updated = [...(settings.fuelTypes || [])];
        updated.splice(index, 1);
        handleChange('fuelTypes', updated);
    };

    const addTollRate = () => {
        if(!newTollName || newTollPrice <= 0) return;
        const newToll: TollRate = { 
            id: Date.now().toString(),
            name: newTollName, 
            price: newTollPrice 
        };
        const updated = [...(settings.tollRates || []), newToll];
        handleChange('tollRates', updated);
        setNewTollName('');
        setNewTollPrice(5000);
    };

    const removeTollRate = (index: number) => {
        const updated = [...(settings.tollRates || [])];
        updated.splice(index, 1);
        handleChange('tollRates', updated);
    };

    const addCoverageArea = () => {
        if (!newAreaName) return;
        const newArea: CoverageArea = {
            id: Date.now().toString(),
            name: newAreaName,
            description: newAreaDesc,
            extraPrice: newAreaRentPrice,
            extraDriverPrice: newAreaDriverPrice
        };
        const updated = [...(settings.coverageAreas || []), newArea];
        handleChange('coverageAreas', updated);
        
        // Reset
        setNewAreaName('');
        setNewAreaDesc('');
        setNewAreaRentPrice(0);
        setNewAreaDriverPrice(0);
    };

    const removeCoverageArea = (index: number) => {
        const updated = [...(settings.coverageAreas || [])];
        updated.splice(index, 1);
        handleChange('coverageAreas', updated);
    };

    // Helper to get Role Badge
    const getRoleBadge = (role: UserRole) => {
        switch(role) {
            case UserRole.SUPER_ADMIN: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">Super Admin</span>;
            case UserRole.OWNER: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">Owner</span>;
            case UserRole.ADMIN: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">Admin Staff</span>;
            case UserRole.DPC_ADMIN: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-pink-100 text-pink-700 border border-pink-200">DPC Admin</span>;
            case UserRole.DRIVER: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">Driver App</span>;
            case UserRole.PARTNER: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">Mitra Owner</span>;
            default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">User</span>;
        }
    };
    
    const handleImageReg = (dataUrl: string | null) => {
        if (!dataUrl) { setRegFile(null); setRegPhoto(null); return; }
        setRegPhoto(dataUrl);
        fetch(dataUrl).then(res => res.blob()).then(blob => setRegFile(new File([blob], "profile.jpg", { type: "image/jpeg" })));
    };

    if (!currentUser) return <div className="p-8 text-center"><i className="fas fa-spinner fa-spin"></i> Loading settings...</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Pengaturan</h2>
                    <p className="text-slate-500">Konfigurasi aplikasi dan manajemen sistem.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
            </div>

            {/* TABS */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Umum & Profil</button>
                
                {isOwner && (
                    <>
                        <button onClick={() => setActiveTab('auth_layout')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'auth_layout' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Tampilan Auth</button>
                        <button onClick={() => setActiveTab('business')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'business' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Bisnis & Harga</button>
                        <button onClick={() => setActiveTab('coverage')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'coverage' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Coverage Area</button>
                        <button onClick={() => setActiveTab('coop')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'coop' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Koperasi</button>
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Manajemen User</button>
                        
                        {isSuperAdmin && (
                            <button onClick={() => setActiveTab('system')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'system' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500'}`}>Sistem & Data</button>
                        )}
                    </>
                )}
            </div>

            {/* CONTENT */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Profil Perusahaan</h3>
                        {/* Company Logo - Only for Owner/SuperAdmin */}
                        {(isOwner || isSuperAdmin) ? (
                            <ImageUploader 
                                image={settings.logoUrl || null} 
                                onImageChange={(val) => handleChange('logoUrl', val)} 
                                label="Logo Perusahaan (Sidebar & Invoice)" 
                                aspectRatio="square" 
                                className="w-32" 
                            />
                        ) : (
                            <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center text-slate-500 text-sm">
                                <i className="fas fa-lock mb-2"></i><br/>
                                Upload Logo hanya untuk Owner
                            </div>
                        )}
                        <div><label className="block text-sm font-bold text-slate-700">Nama Perusahaan</label><input type="text" className="w-full border rounded p-2" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} disabled={!isOwner} /></div>
                        <div><label className="block text-sm font-bold text-slate-700">Nama Singkat (App)</label><input type="text" className="w-full border rounded p-2" value={settings.displayName} onChange={e => handleChange('displayName', e.target.value)} disabled={!isOwner} /></div>
                        <div><label className="block text-sm font-bold text-slate-700">Tagline</label><input type="text" className="w-full border rounded p-2" value={settings.tagline} onChange={e => handleChange('tagline', e.target.value)} disabled={!isOwner} /></div>
                        <div><label className="block text-sm font-bold text-slate-700">Alamat</label><textarea className="w-full border rounded p-2" rows={2} value={settings.address} onChange={e => handleChange('address', e.target.value)} disabled={!isOwner} /></div>
                        <div><label className="block text-sm font-bold text-slate-700">Telepon</label><input type="text" className="w-full border rounded p-2" value={settings.phone} onChange={e => handleChange('phone', e.target.value)} disabled={!isOwner} /></div>
                        <div><label className="block text-sm font-bold text-slate-700">Email</label><input type="text" className="w-full border rounded p-2" value={settings.email} onChange={e => handleChange('email', e.target.value)} disabled={!isOwner} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Tampilan Aplikasi</h3>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tema Warna</label>
                            <div className="flex flex-wrap gap-2">
                                {['red', 'blue', 'green', 'purple', 'orange', 'black'].map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => handleChange('themeColor', c)}
                                        className={`w-8 h-8 rounded-full border-2 ${settings.themeColor === c ? 'border-slate-600 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c === 'black' ? '#1F2937' : c === 'red' ? '#DC2626' : c === 'blue' ? '#2563EB' : c === 'green' ? '#16A34A' : c === 'purple' ? '#7C3AED' : '#EA580C' }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mode Gelap</label>
                            <div className="flex gap-2">
                                <button onClick={() => handleChange('darkMode', false)} className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${!settings.darkMode ? 'bg-slate-100 border-slate-300' : 'bg-white'}`}><Sun size={16}/> Terang</button>
                                <button onClick={() => handleChange('darkMode', true)} className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${settings.darkMode ? 'bg-slate-800 text-white border-slate-600' : 'bg-white'}`}><Moon size={16}/> Gelap</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW AUTH LAYOUT TAB */}
            {activeTab === 'auth_layout' && isOwner && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 flex items-center gap-2">
                            <Monitor size={20}/> Konten Login Panel Kiri
                        </h3>
                        <p className="text-sm text-slate-500">Atur tampilan teks dan gambar pada sisi kiri halaman Login.</p>
                        
                        <div>
                            <ImageUploader 
                                image={settings.globalLogoUrl || null} 
                                onImageChange={(val) => handleChange('globalLogoUrl', val)} 
                                label="Logo Emblem (Tengah)" 
                                aspectRatio="square" 
                                className="w-32 bg-slate-900 rounded-xl" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Judul Utama (Header)</label>
                            <input 
                                type="text" 
                                className="w-full border rounded p-2" 
                                placeholder="ASPERDA | SURABAYA"
                                value={settings.authTitle || ''} 
                                onChange={e => handleChange('authTitle', e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Sub-Header</label>
                            <input 
                                type="text" 
                                className="w-full border rounded p-2" 
                                placeholder="Sistem Manajemen..."
                                value={settings.authSubtitle || ''} 
                                onChange={e => handleChange('authSubtitle', e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Kutipan / Quote</label>
                            <textarea 
                                className="w-full border rounded p-2" 
                                rows={3}
                                placeholder='"Platform digital..."'
                                value={settings.authQuote || ''} 
                                onChange={e => handleChange('authQuote', e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 flex items-center gap-2">
                            <ImageIcon size={20}/> Background Visual
                        </h3>
                        <p className="text-sm text-slate-500">Gambar ini akan digunakan sebagai background artistik halaman Login & Register.</p>
                        
                        <div className="flex justify-center">
                            <ImageUploader 
                                image={settings.globalBackgroundUrl || null} 
                                onImageChange={(val) => handleChange('globalBackgroundUrl', val)} 
                                label="Background Image" 
                                aspectRatio="video" 
                                className="w-full" 
                            />
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500">
                            <strong>Tips:</strong> Gunakan gambar gelap atau abstrak agar teks tetap terbaca jelas.
                        </div>
                    </div>
                </div>
            )}

            {/* COVERAGE AREA TAB */}
            {activeTab === 'coverage' && isOwner && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b pb-4 mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><MapPin size={20}/> Coverage Area & Surcharge</h3>
                                <p className="text-sm text-slate-500 mt-1">Atur biaya tambahan untuk perjalanan ke luar kota / wilayah tertentu.</p>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                            <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase">Tambah Wilayah Baru</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input 
                                    className="border rounded-lg p-2.5 text-sm" 
                                    placeholder="Nama Wilayah (misal: Jawa Tengah)" 
                                    value={newAreaName}
                                    onChange={e => setNewAreaName(e.target.value)}
                                />
                                <input 
                                    className="border rounded-lg p-2.5 text-sm" 
                                    placeholder="Keterangan / Kota Cakupan" 
                                    value={newAreaDesc}
                                    onChange={e => setNewAreaDesc(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Surcharge Sewa Unit (Per Hari)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rp</span>
                                        <input 
                                            type="number" 
                                            className="w-full border rounded-lg pl-8 p-2.5 text-sm font-bold" 
                                            placeholder="0" 
                                            value={newAreaRentPrice}
                                            onChange={e => setNewAreaRentPrice(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Surcharge Jasa Driver (Per Hari)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rp</span>
                                        <input 
                                            type="number" 
                                            className="w-full border rounded-lg pl-8 p-2.5 text-sm font-bold" 
                                            placeholder="0" 
                                            value={newAreaDriverPrice}
                                            onChange={e => setNewAreaDriverPrice(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button onClick={addCoverageArea} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700">
                                <Plus size={16}/> Tambah Area
                            </button>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {settings.coverageAreas?.length === 0 && <p className="text-center text-slate-500 py-4 italic">Belum ada data wilayah.</p>}
                            {settings.coverageAreas?.map((area, idx) => (
                                <div key={area.id || idx} className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors">
                                    <div className="mb-2 md:mb-0">
                                        <h5 className="font-bold text-slate-800 text-base">{area.name}</h5>
                                        <p className="text-sm text-slate-500">{area.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Unit</div>
                                            <div className="font-mono text-sm font-bold text-slate-700">+Rp {area.extraPrice.toLocaleString('id-ID')}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Driver</div>
                                            <div className="font-mono text-sm font-bold text-slate-700">+Rp {area.extraDriverPrice.toLocaleString('id-ID')}</div>
                                        </div>
                                        <button onClick={() => removeCoverageArea(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-full ml-2">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'coop' && isOwner && (
                <div className="space-y-6 animate-in fade-in">
                    {/* ... Membership Card ... */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4 flex items-center gap-2">
                            <Building size={20} className="text-indigo-600"/> Status Keanggotaan Saya
                        </h3>
                        {/* Logic */}
                        {loadingCoop ? (
                            <div className="p-8 text-center text-slate-500"><i className="fas fa-spinner fa-spin"></i> Memuat data...</div>
                        ) : myMembership ? (
                            /* Membership Card */
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="w-full md:w-80 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-2xl relative overflow-hidden flex-shrink-0">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full -ml-10 -mb-10"></div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h4 className="font-bold text-lg tracking-widest">ASPERDA</h4>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Kartu Anggota Digital</p>
                                        </div>
                                        <CreditCard className="text-indigo-400 opacity-80" size={24}/>
                                    </div>
                                    <div className="flex gap-4 items-center mb-6">
                                        <div className="w-16 h-16 rounded-lg bg-slate-700 border-2 border-slate-600 overflow-hidden">
                                            {myMembership.photo_url ? (
                                                <img src={myMembership.photo_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500"><i className="fas fa-user"></i></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400">Nama Anggota</div>
                                            <div className="font-bold text-sm">{myMembership.full_name}</div>
                                            <div className="text-xs text-slate-400 mt-1">ID Anggota</div>
                                            <div className="font-mono font-bold text-yellow-400">{myMembership.member_id}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-slate-700 pt-4">
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase">Wilayah</div>
                                            <div className="font-bold text-xs">{myMembership.dpc_regions?.name || '-'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-400 uppercase">Status</div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${myMembership.status === 'Aktif' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                {myMembership.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-bold text-green-800 flex items-center gap-2 mb-2"><CheckCircle size={18}/> Anda Terdaftar</h4>
                                        <p className="text-sm text-green-700">Selamat! Akun Anda telah terverifikasi sebagai anggota resmi Koperasi ASPERDA.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Registration Form */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl text-center">
                                        <div className="text-indigo-400 mx-auto mb-4 text-4xl"><i className="fas fa-shield-alt"></i></div>
                                        <h4 className="font-bold text-lg text-indigo-900 mb-2">Belum Terdaftar</h4>
                                        <p className="text-sm text-indigo-700 mb-6">Bergabunglah dengan Koperasi ASPERDA untuk mendapatkan manfaat lebih.</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                                    <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Formulir Pendaftaran</h4>
                                    <form onSubmit={handleCoopRegister} className="space-y-4">
                                        <div className="flex justify-center mb-4">
                                            <ImageUploader image={regPhoto} onImageChange={handleImageReg} aspectRatio="square" className="w-24 bg-white" placeholder="Foto Diri" />
                                        </div>
                                        <input required className="w-full border rounded p-2 text-sm" placeholder="Nama Lengkap" value={regFullName} onChange={e => setRegFullName(e.target.value)} />
                                        <input required className="w-full border rounded p-2 text-sm" placeholder="Kota Domisili" value={regCity} onChange={e => setRegCity(e.target.value)} />
                                        <textarea required rows={2} className="w-full border rounded p-2 text-sm" placeholder="Alamat Lengkap" value={regAddress} onChange={e => setRegAddress(e.target.value)} />
                                        <button type="submit" disabled={loadingCoop} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 text-sm">
                                            {loadingCoop ? 'Mengirim Data...' : 'Daftar Sekarang'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* DPC Admin Logic */}
                    {isDpcAdmin && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4 flex items-center gap-2"><CheckCircle size={20} className="text-green-600"/> Konfirmasi Anggota Baru (DPC)</h3>
                            {pendingMembers.length === 0 ? <div className="text-center py-8 text-slate-500 border border-dashed rounded-xl">Tidak ada permintaan.</div> : (
                                <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 font-bold text-slate-600"><tr><th className="p-3">Nama</th><th className="p-3">Kota</th><th className="p-3">Tanggal</th><th className="p-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{pendingMembers.map(pm => (<tr key={pm.id}><td className="p-3">{pm.full_name}</td><td className="p-3">{pm.city}</td><td className="p-3">{pm.join_date}</td><td className="p-3 text-right">{approvalId === pm.id ? (<div className="flex gap-2 justify-end"><input className="border rounded p-1 text-xs w-24" placeholder="ID Baru" value={newMemberIdInput} onChange={e => setNewMemberIdInput(e.target.value)} /><button onClick={() => handleApproveMember(pm.id)} className="bg-green-600 text-white px-2 rounded text-xs">OK</button><button onClick={() => setApprovalId(null)} className="bg-slate-300 text-slate-700 px-2 rounded text-xs">Batal</button></div>) : (<button onClick={() => { setApprovalId(pm.id); setNewMemberIdInput(`AG-${Date.now().toString().slice(-4)}`); }} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Setujui</button>)}</td></tr>))}</tbody></table></div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'business' && isOwner && (
                <div className="space-y-6 animate-in fade-in">
                    {/* ... Business content ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4 flex items-center gap-2"><Tag size={20}/> Kategori Mobil</h3>
                            <div className="flex gap-2 mb-4">
                                <input type="text" className="flex-1 border rounded-lg p-2 text-sm" placeholder="Contoh: MPV, SUV" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addListItem('carCategories', newCategory, setNewCategory)}/>
                                <button onClick={() => addListItem('carCategories', newCategory, setNewCategory)} className="bg-purple-50 text-purple-600 px-3 py-2 rounded-lg font-bold"><Plus size={18} /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">{settings.carCategories?.map((cat, idx) => (<div key={idx} className="bg-slate-50 border px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">{cat}<button onClick={() => removeListItem('carCategories', idx)} className="text-red-500"><X size={14}/></button></div>))}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4 flex items-center gap-2"><Package size={20}/> Paket Sewa</h3>
                            <div className="flex gap-2 mb-4">
                                <input type="text" className="flex-1 border rounded-lg p-2 text-sm" placeholder="Contoh: 12 Jam" value={newPackage} onChange={e => setNewPackage(e.target.value)} onKeyDown={e => e.key === 'Enter' && addListItem('rentalPackages', newPackage, setNewPackage)}/>
                                <button onClick={() => addListItem('rentalPackages', newPackage, setNewPackage)} className="bg-pink-50 text-pink-600 px-3 py-2 rounded-lg font-bold"><Plus size={18} /></button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">{settings.rentalPackages?.map((pkg, idx) => (<div key={idx} className="flex justify-between bg-slate-50 border p-2 rounded text-sm"><span>{pkg}</span><button onClick={() => removeListItem('rentalPackages', idx)} className="text-red-500"><Trash2 size={16} /></button></div>))}</div>
                        </div>
                    </div>

                    {/* NEW ROW: FUEL & TOLL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fuel Settings */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4 flex items-center gap-2"><Fuel size={20}/> Harga BBM</h3>
                            
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <select 
                                    className="border rounded-lg p-2 text-sm bg-slate-50"
                                    value={newFuelCat}
                                    onChange={e => setNewFuelCat(e.target.value as any)}
                                >
                                    <option value="Gasoline">Bensin</option>
                                    <option value="Gasoil">Solar/Diesel</option>
                                    <option value="Electric">Listrik</option>
                                </select>
                                <input 
                                    type="text" 
                                    className="border rounded-lg p-2 text-sm" 
                                    placeholder="Nama (Pertamax)" 
                                    value={newFuelName} 
                                    onChange={e => setNewFuelName(e.target.value)} 
                                />
                            </div>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="number" 
                                    className="flex-1 border rounded-lg p-2 text-sm" 
                                    placeholder="Harga per Liter" 
                                    value={newFuelPrice} 
                                    onChange={e => setNewFuelPrice(Number(e.target.value))} 
                                />
                                <button onClick={addFuelType} className="bg-orange-50 text-orange-600 px-3 py-2 rounded-lg font-bold hover:bg-orange-100 transition-colors"><Plus size={18} /></button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {settings.fuelTypes?.map((fuel, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 border p-2 rounded text-sm">
                                        <div>
                                            <span className="font-bold text-slate-800">{fuel.name}</span>
                                            <span className="text-xs text-slate-500 ml-2">({fuel.category})</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-medium">Rp {fuel.price.toLocaleString('id-ID')}</span>
                                            <button onClick={() => removeFuelType(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Toll Settings */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4 flex items-center gap-2"><DollarSign size={20}/> Tarif Tol</h3>
                            
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    className="flex-1 border rounded-lg p-2 text-sm" 
                                    placeholder="Nama Ruas Tol (Waru-Juanda)" 
                                    value={newTollName} 
                                    onChange={e => setNewTollName(e.target.value)} 
                                />
                            </div>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="number" 
                                    className="flex-1 border rounded-lg p-2 text-sm" 
                                    placeholder="Tarif (Rp)" 
                                    value={newTollPrice} 
                                    onChange={e => setNewTollPrice(Number(e.target.value))} 
                                />
                                <button onClick={addTollRate} className="bg-green-50 text-green-600 px-3 py-2 rounded-lg font-bold hover:bg-green-100 transition-colors"><Plus size={18} /></button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {settings.tollRates?.map((toll, idx) => (
                                    <div key={toll.id || idx} className="flex justify-between items-center bg-slate-50 border p-2 rounded text-sm">
                                        <span className="font-bold text-slate-800">{toll.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-medium text-green-700">Rp {toll.price.toLocaleString('id-ID')}</span>
                                            <button onClick={() => removeTollRate(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* USERS */}
            {activeTab === 'users' && isOwner && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6 animate-in fade-in">
                    {/* ... Users Content ... */}
                    <div className="flex justify-between items-center border-b pb-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800"><Users size={20} className="inline mr-2"/> Daftar Pengguna</h3>
                            <p className="text-sm text-slate-500 mt-1">Kelola akun staff, driver app, dan akun mitra pemilik.</p>
                        </div>
                        <button onClick={() => openUserModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md">
                            <Plus size={16}/> Tambah Anggota
                        </button>
                    </div>
                    {/* ... Table ... */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4 border-b">Identitas User</th>
                                    <th className="p-4 border-b">Role & Akses</th>
                                    <th className="p-4 border-b">Kontak</th>
                                    <th className="p-4 border-b text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usersList.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 border-b">
                                            <div className="font-bold text-slate-800">{u.name}</div>
                                            <div className="text-xs text-slate-500">{u.username}</div>
                                        </td>
                                        <td className="p-4 border-b">
                                            {getRoleBadge(u.role)}
                                        </td>
                                        <td className="p-4 border-b">
                                            <div className="text-sm text-slate-600">{u.phone || '-'}</div>
                                            <div className="text-xs text-slate-400">{u.email || '-'}</div>
                                        </td>
                                        <td className="p-4 border-b text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openUserModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {usersList.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500 italic">Belum ada user tambahan.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SYSTEM TAB (Super Admin) */}
            {activeTab === 'system' && isSuperAdmin && (
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="font-bold text-lg text-slate-800 mb-4">System Utilities</h3>
                   <div className="space-y-4">
                       <button className="w-full bg-red-100 text-red-700 py-3 rounded-lg font-bold border border-red-200 hover:bg-red-200" onClick={() => { if(confirm("RESET SEMUA DATA?")) localStorage.clear(); window.location.reload(); }}>
                           <Trash2 size={18} className="inline mr-2"/> RESET FACTORY DATA (Clear Cache)
                       </button>
                   </div>
               </div>
            )}

            {/* User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4">Form User</h3>
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Fitur simpan user via Settings dibatasi."); setIsUserModalOpen(false); }}>
                            <input className="w-full border rounded p-2" placeholder="Nama Lengkap" value={uName} onChange={e => setUName(e.target.value)} />
                            <select className="w-full border rounded p-2" value={uRole} onChange={e => setURole(e.target.value as UserRole)}>
                                <option value={UserRole.ADMIN}>Admin Staff</option>
                                <option value={UserRole.DRIVER}>Driver App</option>
                                <option value={UserRole.PARTNER}>Mitra Owner</option>
                            </select>
                            <input className="w-full border rounded p-2" placeholder="Email (Username)" value={uEmail} onChange={e => setUEmail(e.target.value)} />
                            <input className="w-full border rounded p-2" placeholder="No. HP" value={uPhone} onChange={e => setUPhone(e.target.value)} />
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
