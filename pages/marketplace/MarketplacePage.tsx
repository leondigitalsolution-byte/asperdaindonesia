
import React, { useEffect, useState } from 'react';
import { marketplaceService } from '../../service/marketplaceService';
import { authService } from '../../service/authService';
import { MarketplacePost, DpcRegion } from '../../types';
import { Button } from '../../components/ui/Button';

export const MarketplacePage: React.FC = () => {
  const [posts, setPosts] = useState<MarketplacePost[]>([]);
  const [dpcRegions, setDpcRegions] = useState<DpcRegion[]>([]);
  
  // Helper for dates
  const getToday = () => new Date().toISOString().split('T')[0];
  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Filter States with DEFAULTS
  const [selectedDpc, setSelectedDpc] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getToday());
  const [endDate, setEndDate] = useState<string>(getTomorrow());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Load: Get Profile & DPC List & Set Defaults
  useEffect(() => {
    const initPage = async () => {
      try {
        // Fetch Regions first
        const regions = await authService.getDpcRegions();
        setDpcRegions(regions || []);

        // LOGIC: SET DEFAULT SURABAYA
        // Cari ID untuk Surabaya dari list region (Case Insensitive)
        const surabaya = regions?.find(r => r.name.toLowerCase().includes('surabaya'));
        let defaultDpcId = '';

        if (surabaya) {
            defaultDpcId = surabaya.id;
        } else if (regions && regions.length > 0) {
            // Fallback ke region pertama jika Surabaya tidak ada
            defaultDpcId = regions[0].id;
        }

        setSelectedDpc(defaultDpcId);
        
        // Load posts with defaults (Surabaya + Today + Tomorrow)
        await loadPosts(defaultDpcId, getToday(), getTomorrow());

      } catch (err) {
        console.error("Init Error", err);
        setError("Gagal memuat data awal.");
        setLoading(false);
      }
    };
    initPage();
  }, []);

  // 2. Fetch Posts Function
  const loadPosts = async (dpcId?: string, start?: string, end?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Pass date range to service
      const data = await marketplaceService.getPosts(dpcId, start, end);
      setPosts(data);
    } catch (err: any) {
      console.error(err);
      setError("Gagal memuat data marketplace.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadPosts(selectedDpc || undefined, startDate, endDate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bursa Mobil (Marketplace)</h1>
        <p className="text-slate-500 text-sm">Cari ketersediaan unit dari rekanan ASPERDA di berbagai wilayah.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleFilter} className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="w-full lg:w-1/3">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Wilayah (DPC)</label>
            <select
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50"
              value={selectedDpc}
              onChange={(e) => setSelectedDpc(e.target.value)}
            >
              <option value="">-- Pilih Wilayah --</option>
              {dpcRegions.map((dpc) => (
                <option key={dpc.id} value={dpc.id}>{dpc.name} - {dpc.province}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full lg:w-1/4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="w-full lg:w-1/4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Kembali</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="w-full lg:w-auto">
            <Button type="submit" className="lg:w-auto w-full">
              <i className="fas fa-search mr-2"></i> Cari Unit
            </Button>
          </div>
        </form>
      </div>

      {/* Results */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <i className="fas fa-spinner fa-spin text-2xl mb-3"></i>
          <p>Mencari ketersediaan unit...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
             <i className="fas fa-search"></i>
           </div>
           <h3 className="text-lg font-medium text-slate-900">Unit Tidak Ditemukan</h3>
           <p className="text-slate-500 max-w-sm mx-auto">
             Tidak ada penawaran unit di wilayah <strong>{dpcRegions.find(r => r.id === selectedDpc)?.name || 'terpilih'}</strong> pada rentang tanggal tersebut.
           </p>
           <p className="text-xs text-slate-400 mt-2">Coba ubah tanggal atau wilayah pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                 <div className="flex justify-between items-start">
                   <div>
                     <span className="text-xs font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full mb-2 inline-block">Available</span>
                     <h3 className="font-bold text-slate-900 text-lg leading-tight">{post.title}</h3>
                   </div>
                 </div>
              </div>
              
              <div className="p-4 flex-1">
                <p className="text-sm text-slate-600 line-clamp-3 mb-4">{post.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-calendar-check w-4 text-slate-400"></i>
                    <span className="font-medium text-slate-800">
                        {new Date(post.date_needed).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} 
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-map-marker-alt w-4 text-slate-400"></i>
                    <span>{post.companies?.dpc_regions?.name || 'Unknown Region'}</span>
                  </div>
                   <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-building w-4 text-slate-400"></i>
                    <span className="truncate">{post.companies?.name || 'Unknown Rental'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 mt-auto">
                <div className="flex justify-between items-center mb-3">
                   <p className="text-xs text-slate-500">Harga Penawaran</p>
                   <p className="text-lg font-bold text-slate-900">Rp {post.price.toLocaleString('id-ID')}</p>
                </div>
                <a 
                  href={`https://wa.me/${post.companies?.phone?.replace(/^0/, '62')}?text=Halo, saya lihat postingan marketplace Anda untuk ${post.title}. Saya butuh unit dari tanggal ${startDate} s/d ${endDate}. Masih tersedia?`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  <i className="fab fa-whatsapp text-lg"></i> Hubungi Pemilik
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
