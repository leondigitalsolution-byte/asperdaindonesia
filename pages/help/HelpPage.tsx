
import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen, Car, DollarSign, ShieldAlert, Users, Settings, HelpCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // --- KATEGORI: MEMULAI ---
  {
    id: 'start-1',
    category: 'Memulai',
    question: 'Apa langkah pertama setelah mendaftar akun?',
    answer: 'Setelah mendaftar, langkah pertama adalah melengkapi **Pengaturan Perusahaan** (Menu Settings). Upload Logo, atur kategori mobil, dan paket sewa. Setelah itu, mulailah menginput data **Armada Mobil** dan **Data Pelanggan** Anda agar siap digunakan saat membuat transaksi.'
  },
  {
    id: 'start-2',
    category: 'Memulai',
    question: 'Bagaimana cara menambahkan user/staff lain?',
    answer: 'Anda bisa menambahkan akun untuk staff admin atau driver melalui menu **Pengaturan > Manajemen User**. Staff akan memiliki akses terbatas sesuai Role yang Anda berikan (misal: Driver hanya bisa melihat jadwal, Admin bisa membuat booking).'
  },

  // --- KATEGORI: TRANSAKSI (BOOKING) ---
  {
    id: 'book-1',
    category: 'Transaksi',
    question: 'Jelaskan alur status Booking dari awal sampai akhir?',
    answer: (
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>PENDING:</strong> Booking dibuat tapi belum dikonfirmasi (biasanya menunggu DP).</li>
        <li><strong>CONFIRMED (BOOKED):</strong> Jadwal sudah dikunci. Mobil tidak bisa disewa orang lain di tanggal tersebut.</li>
        <li><strong>ACTIVE (JALAN):</strong> Unit sudah diserah-terimakan ke pelanggan (Checklist Awal sudah diisi).</li>
        <li><strong>COMPLETED (SELESAI):</strong> Unit sudah kembali, pembayaran lunas, dan Checklist Akhir selesai.</li>
        <li><strong>CANCELLED:</strong> Transaksi dibatalkan, jadwal mobil kembali tersedia.</li>
      </ul>
    )
  },
  {
    id: 'book-2',
    category: 'Transaksi',
    question: 'Bagaimana cara mencetak Invoice / Kwitansi?',
    answer: 'Di halaman **List Transaksi**, klik tombol "Invoice" pada kartu booking yang diinginkan. Anda bisa memilih "Print Invoice" untuk mencetak langsung atau menyimpannya sebagai PDF. Pastikan data perusahaan di menu Settings sudah lengkap agar kop surat tampil dengan benar.'
  },
  {
    id: 'book-3',
    category: 'Transaksi',
    question: 'Apa fungsi fitur "PayLater"?',
    answer: 'PayLater digunakan jika pelanggan atau rekanan ingin membayar dengan tempo (hutang). Transaksi PayLater akan otomatis mencatat status "Lunas" di pembukuan rental Anda (karena dianggap piutang), namun tagihan akan muncul di menu **Monitoring PayLater** untuk ditagih dikemudian hari sesuai tenor.'
  },

  // --- KATEGORI: OPERASIONAL ---
  {
    id: 'ops-1',
    category: 'Operasional',
    question: 'Mengapa saya harus mengisi Checklist Kendaraan?',
    answer: 'Checklist digital adalah bukti sah kondisi mobil. Saat serah terima (Active), Anda memfoto kondisi mobil, bensin, dan KM. Saat kembali (Completed), Anda membandingkannya. Jika ada baret baru atau BBM kurang, Anda memiliki bukti foto "Before & After" untuk klaim biaya tambahan ke penyewa.'
  },
  {
    id: 'ops-2',
    category: 'Operasional',
    question: 'Bagaimana jika mobil penyewa terlambat kembali (Overdue)?',
    answer: 'Sistem akan mendeteksi keterlambatan berdasarkan jam sewa. Saat memproses pengembalian unit (di halaman Edit Booking atau Checklist Akhir), Anda bisa memasukkan nominal **Denda Keterlambatan (Overdue Fee)**. Biaya ini akan ditambahkan ke total tagihan yang harus dilunasi pelanggan.'
  },

  // --- KATEGORI: KEUANGAN ---
  {
    id: 'fin-1',
    category: 'Keuangan',
    question: 'Apakah Pemasukan Booking masuk otomatis ke Keuangan?',
    answer: 'Ya. Setiap kali Anda menekan tombol **"Bayar"** atau **"Lunas"** pada transaksi booking, sistem otomatis mencatat nominal tersebut sebagai "Pemasukan (Income)" di menu Arus Kas. Anda tidak perlu mencatat manual lagi.'
  },
  {
    id: 'fin-2',
    category: 'Keuangan',
    question: 'Bagaimana cara mencatat pengeluaran operasional?',
    answer: 'Masuk ke menu **Arus Kas (Finance)**, klik "Catat Pengeluaran". Anda bisa mencatat biaya BBM, Gaji Driver, Service Mobil, atau Setoran ke Mitra. Anda juga bisa mengupload foto nota fisik sebagai bukti arsip digital.'
  },

  // --- KATEGORI: FITUR UNGGULAN ---
  {
    id: 'feat-1',
    category: 'Fitur Unggulan',
    question: 'Apa itu Global Blacklist?',
    answer: 'Global Blacklist adalah database bersama seluruh member ASPERDA se-Indonesia. Jika ada penyewa yang bermasalah (menggadaikan mobil, kabur, tidak bayar), member bisa melaporkannya. Saat Anda membuat booking baru, sistem otomatis mengecek NIK/No HP pelanggan. Jika terdaftar di Blacklist, sistem akan memberikan peringatan merah.'
  },
  {
    id: 'feat-2',
    category: 'Fitur Unggulan',
    question: 'Bagaimana cara kerja Marketplace?',
    answer: 'Marketplace memungkinkan Anda melihat unit mobil yang "Available" (menganggur) milik rental lain di satu wilayah. Jika Anda kehabisan unit, Anda bisa mencari di Marketplace dan menyewa dari rekanan (Over-rent) untuk memenuhi order pelanggan Anda.'
  },
];

const CATEGORIES = [
  { id: 'Memulai', icon: BookOpen, label: 'Memulai' },
  { id: 'Transaksi', icon: Car, label: 'Booking & Sewa' },
  { id: 'Operasional', icon: Settings, label: 'Operasional' },
  { id: 'Keuangan', icon: DollarSign, label: 'Keuangan' },
  { id: 'Fitur Unggulan', icon: ShieldAlert, label: 'Fitur Khusus' },
];

export const HelpPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('Memulai');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const filteredData = useMemo(() => {
    let data = FAQ_DATA;

    // Filter by Category first (if not searching)
    if (!searchQuery) {
      data = data.filter(item => item.category === activeCategory);
    }

    // Filter by Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = FAQ_DATA.filter(item => 
        item.question.toLowerCase().includes(lowerQuery) || 
        (typeof item.answer === 'string' && item.answer.toLowerCase().includes(lowerQuery))
      );
    }

    return data;
  }, [activeCategory, searchQuery]);

  return (
    <div className="pb-20 max-w-6xl mx-auto">
      <div className="mb-8 text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Pusat Bantuan & Tutorial</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Temukan jawaban atas pertanyaan Anda dan pelajari cara memaksimalkan penggunaan sistem manajemen rental ASPERDA.
        </p>
        
        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm text-sm"
            placeholder="Cari topik bantuan (misal: invoice, blacklist, checklist)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Categories (Desktop) / Horizontal Scroll (Mobile) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 hidden lg:block">Kategori</h3>
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id && !searchQuery;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-200' : 'text-slate-400'} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            
            {/* Support Box */}
            <div className="mt-8 bg-indigo-50 rounded-xl p-5 border border-indigo-100 hidden lg:block">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
                    <HelpCircle size={20}/>
                </div>
                <h4 className="font-bold text-indigo-900 text-sm mb-1">Butuh bantuan teknis?</h4>
                <p className="text-xs text-indigo-700 mb-3">Tim support IT kami siap membantu jika terjadi error sistem.</p>
                <a href="mailto:support@asperda.id" className="text-xs font-bold text-indigo-600 hover:underline">Hubungi Support &rarr;</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="font-bold text-lg text-slate-800">
                    {searchQuery ? `Hasil Pencarian: "${searchQuery}"` : activeCategory}
                  </h2>
                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                    {filteredData.length} Artikel
                  </span>
              </div>
              
              <div className="divide-y divide-slate-100">
                  {filteredData.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                          <div className="mb-2 text-4xl">🤔</div>
                          <p>Tidak ditemukan artikel dengan kata kunci tersebut.</p>
                          <button onClick={() => setSearchQuery('')} className="text-blue-600 font-bold text-sm mt-2 hover:underline">Reset Pencarian</button>
                      </div>
                  ) : (
                      filteredData.map((item) => (
                          <div key={item.id} className="group">
                              <button 
                                onClick={() => toggleAccordion(item.id)}
                                className="w-full text-left px-6 py-5 flex justify-between items-start hover:bg-slate-50 transition-colors focus:outline-none"
                              >
                                  <div className="flex gap-3">
                                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${openId === item.id ? 'bg-blue-500' : 'bg-slate-300 group-hover:bg-blue-300'}`}></div>
                                      <span className={`font-medium text-sm ${openId === item.id ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                                          {item.question}
                                      </span>
                                  </div>
                                  {openId === item.id ? <ChevronUp size={18} className="text-blue-500"/> : <ChevronDown size={18} className="text-slate-400"/>}
                              </button>
                              
                              {openId === item.id && (
                                  <div className="px-6 pb-6 pl-11 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                          {item.answer}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))
                  )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
