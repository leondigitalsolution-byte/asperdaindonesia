
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookingService } from '../../service/bookingService';
import { Booking, BookingStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, User, FileText, MessageCircle, Edit, Trash2, CheckCircle, XCircle, ClipboardCheck, Car as CarIcon, Filter, ChevronDown, Printer, Download } from 'lucide-react';

export const BookingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dropdown State
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = bookings;

    if (filterStartDate) {
      result = result.filter(b => new Date(b.start_date) >= new Date(filterStartDate));
    }
    if (filterEndDate) {
      result = result.filter(b => new Date(b.end_date) <= new Date(filterEndDate));
    }
    if (filterStatus !== 'ALL') {
      result = result.filter(b => b.status === filterStatus);
    }

    setFilteredBookings(result);
  }, [bookings, filterStartDate, filterEndDate, filterStatus]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getBookings();
      setBookings(data);
      setFilteredBookings(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission denied') || err.code === '42501') {
        setError("Akses ditolak. Hubungi administrator sistem.");
      } else {
        setError(err.message || "Gagal memuat data booking.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getDurationDays = (start: string, end: string) => {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const diff = Math.ceil((e - s) / (1000 * 3600 * 24));
      return diff > 0 ? diff : 1;
  };

  // Status Styling & Label Map
  const getStatusConfig = (status: BookingStatus) => {
    switch(status) {
        case BookingStatus.ACTIVE:
            return { color: 'border-l-green-500', badge: 'bg-green-600 text-white', label: 'ACTIVE' };
        case BookingStatus.CONFIRMED:
            return { color: 'border-l-orange-500', badge: 'bg-orange-500 text-white', label: 'BOOKED' }; // Map Confirmed to BOOKED visually
        case BookingStatus.PENDING:
            return { color: 'border-l-yellow-400', badge: 'bg-yellow-400 text-yellow-900', label: 'PENDING' };
        case BookingStatus.COMPLETED:
            return { color: 'border-l-blue-600', badge: 'bg-blue-600 text-white', label: 'COMPLETED' };
        case BookingStatus.CANCELLED:
            return { color: 'border-l-slate-300', badge: 'bg-slate-200 text-slate-600', label: 'CANCELLED' };
        default:
            return { color: 'border-l-gray-300', badge: 'bg-gray-200 text-gray-800', label: status };
    }
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Apakah anda yakin ingin menghapus data booking ini?')) {
          alert("Fitur hapus akan diimplementasikan pada update berikutnya.");
      }
  };

  const handleWhatsApp = (booking: Booking) => {
      if(!booking.customers?.phone) return;
      const msg = `Halo ${booking.customers.full_name}, ini mengenai booking mobil ${booking.cars?.brand} ${booking.cars?.model} untuk tanggal ${formatDate(booking.start_date)}.`;
      window.open(`https://wa.me/${booking.customers.phone.replace(/^0/, '62')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleChecklist = (bookingId: string) => {
      alert("Fitur Checklist Serah Terima (Modal) akan muncul di sini.");
  };
  
  // ACTION BUTTONS HANDLERS
  const handleStatusChange = async (id: string, newStatus: BookingStatus) => {
      if(!window.confirm(`Ubah status booking menjadi ${newStatus}?`)) return;
      
      try {
          await bookingService.updateBooking(id, { status: newStatus });
          fetchBookings(); // Reload data
      } catch (e: any) {
          alert("Gagal update status: " + e.message);
      }
  };
  
  const handleLunasi = async (booking: Booking) => {
      if(window.confirm(`Konfirmasi pelunasan sebesar Rp ${(booking.total_price - (booking.amount_paid || 0)).toLocaleString('id-ID')}?`)) {
          try {
              await bookingService.updateBooking(booking.id, { 
                  amount_paid: booking.total_price 
              });
              fetchBookings();
          } catch(e: any) {
              alert("Gagal update pembayaran: " + e.message);
          }
      }
  };
  
  const handlePrintInvoice = (booking: Booking) => {
      const remaining = booking.total_price - (booking.amount_paid || 0);
      const invoiceHTML = `
        <html>
        <head>
          <title>Invoice - ${booking.id}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .details { margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; font-size: 1.2em; border-top: 1px solid #ccc; margin-top: 10px; padding-top: 5px; }
            .status { text-align: center; margin-top: 20px; font-weight: bold; color: ${remaining <= 0 ? 'green' : 'red'}; border: 2px solid currentColor; padding: 10px; display: inline-block; }
          </style>
        </head>
        <body>
           <div class="header">
             <h1>INVOICE RENTAL</h1>
             <p>No: #${booking.id.slice(0, 8).toUpperCase()}</p>
           </div>
           <div class="details">
             <div class="row"><span>Penyewa:</span> <span>${booking.customers?.full_name}</span></div>
             <div class="row"><span>Unit:</span> <span>${booking.cars?.brand} ${booking.cars?.model} (${booking.cars?.license_plate})</span></div>
             <div class="row"><span>Tanggal Sewa:</span> <span>${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}</span></div>
             <div class="row"><span>Total Biaya:</span> <span>Rp ${booking.total_price.toLocaleString('id-ID')}</span></div>
             <div class="row"><span>Sudah Bayar:</span> <span>Rp ${(booking.amount_paid || 0).toLocaleString('id-ID')}</span></div>
             <div class="row total"><span>Sisa Tagihan:</span> <span>Rp ${remaining.toLocaleString('id-ID')}</span></div>
           </div>
           <div style="text-align:center">
             <div class="status">${remaining <= 0 ? 'LUNAS' : 'BELUM LUNAS'}</div>
           </div>
           <script>window.print();</script>
        </body>
        </html>
      `;
      
      const win = window.open('', '_blank');
      if(win) {
          win.document.write(invoiceHTML);
          win.document.close();
      }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h1 className="text-2xl font-bold text-slate-900">Data Transaksi Sewa</h1>
            <Link to="/dashboard/bookings/new">
                <Button className="!w-auto"><i className="fas fa-plus mr-2"></i> Buat Order Baru</Button>
            </Link>
        </div>

        {/* Filter Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-3">
             <div className="flex items-center gap-2 text-slate-500 text-sm font-bold min-w-fit">
                 <Filter size={16}/> FILTER DATA:
             </div>
             
             <div className="flex items-center gap-2 w-full md:w-auto">
                 <input 
                    type="date" 
                    className="border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="dd-mm-yyyy"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                 />
                 <span className="text-slate-400 text-sm">sampai</span>
                 <input 
                    type="date" 
                    className="border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="dd-mm-yyyy"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                 />
             </div>

             <select 
                className="w-full md:w-48 border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
             >
                 <option value="ALL">SEMUA STATUS</option>
                 <option value={BookingStatus.ACTIVE}>ACTIVE (Jalan)</option>
                 <option value={BookingStatus.CONFIRMED}>BOOKED</option>
                 <option value={BookingStatus.PENDING}>PENDING</option>
                 <option value={BookingStatus.COMPLETED}>COMPLETED</option>
                 <option value={BookingStatus.CANCELLED}>CANCELLED</option>
             </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-red-700">
           <p className="font-bold">Terjadi Kesalahan</p>
           <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Booking Cards List */}
      <div className="space-y-4">
          {loading ? (
             <div className="text-center py-12 text-slate-500">
                 <i className="fas fa-spinner fa-spin mr-2"></i> Memuat data...
             </div>
          ) : filteredBookings.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500">
                 Belum ada transaksi yang sesuai filter.
             </div>
          ) : (
            filteredBookings.map((booking) => {
                const statusStyle = getStatusConfig(booking.status);
                const remaining = booking.total_price - (booking.amount_paid || 0);
                const isPaidOff = remaining <= 0;

                return (
                    <div key={booking.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row border-l-[6px] ${statusStyle.color}`}>
                        {/* Icon & Main Info */}
                        <div className="p-4 flex-1">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <CarIcon size={24} />
                                </div>
                                <div className="w-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 uppercase">{booking.cars?.brand} {booking.cars?.model}</h3>
                                            <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded border border-slate-200 mt-1">
                                                {booking.cars?.license_plate}
                                            </span>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle.badge}`}>
                                            {statusStyle.label}
                                        </span>
                                    </div>
                                    
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar size={16} className="text-blue-500"/>
                                            <span className="font-medium">{formatDate(booking.start_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Clock size={16} className="text-orange-500"/>
                                            <span className="font-bold text-orange-600 uppercase">{getDurationDays(booking.start_date, booking.end_date)} HARI</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <User size={16} className="text-blue-500"/>
                                            <span className="font-bold text-blue-600 uppercase text-xs">{booking.customers?.full_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className="font-bold text-red-600">Rp {booking.total_price.toLocaleString('id-ID')}</span>
                                            {remaining > 0 && (
                                                <span className="text-[10px] text-red-400 font-medium">(Sisa: {remaining.toLocaleString('id-ID')})</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                                        {/* Main Action Button based on State */}
                                        {booking.status !== BookingStatus.CANCELLED && (
                                            <>
                                                <button 
                                                    onClick={() => !isPaidOff && handleLunasi(booking)}
                                                    disabled={isPaidOff}
                                                    className={`px-4 py-1.5 rounded text-xs font-bold text-white flex items-center gap-1 shadow-sm ${isPaidOff ? 'bg-green-600 cursor-default opacity-80' : 'bg-green-50 hover:bg-green-600'}`}
                                                >
                                                    {isPaidOff ? <CheckCircle size={14}/> : null}
                                                    {isPaidOff ? 'LUNAS' : 'LUNASI'}
                                                </button>
                                                
                                                {booking.status === BookingStatus.ACTIVE ? (
                                                     <button 
                                                        onClick={() => handleStatusChange(booking.id, BookingStatus.COMPLETED)}
                                                        className="px-4 py-1.5 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1"
                                                     >
                                                        <Clock size={14}/> SELESAI
                                                     </button>
                                                ) : booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING ? (
                                                     <button 
                                                        onClick={() => handleStatusChange(booking.id, BookingStatus.CANCELLED)}
                                                        className="px-4 py-1.5 rounded text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 shadow-sm flex items-center gap-1"
                                                     >
                                                        <XCircle size={14}/> CANCEL
                                                     </button>
                                                ) : null}
                                            </>
                                        )}

                                        <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>

                                        {/* Utility Buttons - Checklist Moved to First */}
                                        <button onClick={() => handleChecklist(booking.id)} className="px-3 py-1.5 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1 transition-colors">
                                            <ClipboardCheck size={14}/> Checklist
                                        </button>
                                        
                                        <button onClick={() => handleWhatsApp(booking)} className="px-3 py-1.5 rounded text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 flex items-center gap-1 transition-colors">
                                            <MessageCircle size={14}/> Kirim WA
                                        </button>
                                        
                                        {/* PDF Dropdown */}
                                        <div className="relative">
                                            <button 
                                                onClick={() => setOpenDropdownId(openDropdownId === booking.id ? null : booking.id)}
                                                className="px-3 py-1.5 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors"
                                            >
                                                <FileText size={14}/> PDF Invoice <ChevronDown size={12}/>
                                            </button>
                                            
                                            {openDropdownId === booking.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                                                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-20 overflow-hidden">
                                                        <button 
                                                            onClick={() => { handlePrintInvoice(booking); setOpenDropdownId(null); }}
                                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50"
                                                        >
                                                            <Printer size={14} className="text-slate-400"/> Print Invoice
                                                        </button>
                                                        <button 
                                                            onClick={() => { handlePrintInvoice(booking); setOpenDropdownId(null); }}
                                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Download size={14} className="text-slate-400"/> Download PDF
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1"></div>

                                        <div className="flex gap-1">
                                            <Link to={`/dashboard/bookings/edit/${booking.id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit Booking">
                                                <Edit size={16}/>
                                            </Link>
                                            <button onClick={() => handleDelete(booking.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Hapus Booking">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })
          )}
      </div>
    </div>
  );
};
