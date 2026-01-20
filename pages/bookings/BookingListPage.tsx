
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { bookingService } from '../../service/bookingService';
import { Booking, BookingStatus, AppSettings, DriverOption } from '../../types';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, User, FileText, MessageCircle, Edit, Trash2, CheckCircle, XCircle, ClipboardCheck, Car as CarIcon, Filter, ChevronDown, Printer, Download, Plus, Star } from 'lucide-react';
import { ChecklistModal } from '../../components/bookings/ChecklistModal';

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

  // Checklist State
  const [checklistBooking, setChecklistBooking] = useState<Booking | null>(null);

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
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
            return { color: 'border-l-green-500', badge: 'bg-green-600 text-white', label: 'ACTIVE (JALAN)' };
        case BookingStatus.CONFIRMED:
            return { color: 'border-l-blue-500', badge: 'bg-blue-500 text-white', label: 'BOOKED' }; 
        case BookingStatus.PENDING:
            return { color: 'border-l-yellow-400', badge: 'bg-yellow-400 text-yellow-900', label: 'PENDING' };
        case BookingStatus.COMPLETED:
            return { color: 'border-l-slate-600', badge: 'bg-slate-600 text-white', label: 'COMPLETED' };
        case BookingStatus.CANCELLED:
            return { color: 'border-l-red-300', badge: 'bg-red-200 text-red-600', label: 'CANCELLED' };
        default:
            return { color: 'border-l-gray-300', badge: 'bg-gray-200 text-gray-800', label: status };
    }
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Yakin ingin menghapus data booking ini secara permanen? Data yang sudah dihapus tidak bisa dikembalikan.')) {
          try {
              await bookingService.deleteBooking(id);
              fetchBookings(); // Reload list
          } catch(e: any) {
              alert("Gagal menghapus: " + e.message);
          }
      }
  };

  const handleWhatsApp = (booking: Booking) => {
      if(!booking.customers?.phone) return;
      let msg = `Halo ${booking.customers.full_name}, ini mengenai booking mobil ${booking.cars?.brand} ${booking.cars?.model} untuk tanggal ${formatDate(booking.start_date)}.`;
      
      // Feature: Add Review Link if Completed and Token exists
      if (booking.status === BookingStatus.COMPLETED && booking.review_token) {
          const appUrl = window.location.origin;
          msg += `\n\nTerima kasih telah menggunakan jasa kami. Mohon kesediaannya untuk memberikan penilaian layanan melalui link berikut:\n${appUrl}/#/review/${booking.review_token}`;
      }

      window.open(`https://wa.me/${booking.customers.phone.replace(/^0/, '62')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleChecklist = (booking: Booking) => {
      setChecklistBooking(booking);
  };
  
  // ACTION BUTTONS HANDLERS
  const handleStatusChange = async (id: string, newStatus: BookingStatus) => {
      // Logic restriction: Only allow manual status change via checklist for ACTIVE/COMPLETED
      // But we keep "Cancel" here.
      
      if (newStatus === BookingStatus.CANCELLED) {
          if(!window.confirm("Batalkan booking ini? Jadwal mobil akan kembali tersedia untuk orang lain.")) return;
          try {
              await bookingService.updateBooking(id, { status: newStatus });
              fetchBookings(); 
          } catch (e: any) {
              alert("Gagal update status: " + e.message);
          }
      }
  };
  
  const handleLunasi = async (booking: Booking) => {
      if(window.confirm(`Konfirmasi pelunasan sebesar Rp ${(booking.total_price - (booking.amount_paid || 0)).toLocaleString('id-ID')}? Sistem akan mencatat Pemasukan di Kas.`)) {
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
      // 1. Get Company Settings for Header
      const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
      
      // 2. Calculate Costs Breakdown
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
      
      const unitPrice = booking.cars?.price_per_day || 0;
      const totalSewaUnit = unitPrice * days;
      const deliveryFee = booking.delivery_fee || 0;
      const overdueFee = booking.overdue_fee || 0;
      const extraFee = booking.extra_fee || 0;
      
      const calculatedExtras = totalSewaUnit + deliveryFee + overdueFee + extraFee;
      let driverCost = 0;
      let driverDesc = '-';
      
      if (booking.driver_option === DriverOption.WITH_DRIVER) {
          if (booking.total_price > calculatedExtras) {
              driverCost = booking.total_price - calculatedExtras;
              driverDesc = `Jasa Driver (${days} Hari)`;
          }
      }

      const remaining = booking.total_price - (booking.amount_paid || 0);
      const isLunas = remaining <= 0;

      // 3. Generate HTML
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice #${booking.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 850px; margin: 0 auto; color: #1e293b; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 1px solid #f1f5f9; padding-bottom: 30px; }
            .company-info { flex: 1; padding-right: 20px; }
            .logo { max-height: 70px; margin-bottom: 15px; display: block; object-fit: contain; }
            .company-name { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; color: #0f172a; }
            .tagline { font-size: 11px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
            .address { font-size: 13px; line-height: 1.5; color: #334155; }
            .invoice-details { text-align: right; min-width: 200px; }
            .invoice-title { 
                background: #fecaca; color: #991b1b; 
                padding: 10px 25px; font-weight: 800; font-size: 18px; 
                letter-spacing: 2px; text-transform: uppercase; 
                display: inline-block; margin-bottom: 15px; border-radius: 4px; border: 1px solid #fca5a5;
            }
            .meta-table { float: right; width: 100%; }
            .meta-table td { padding: 3px 0 3px 15px; font-size: 14px; text-align: right; }
            .meta-label { font-weight: 700; color: #64748b; }
            .meta-val { font-weight: 600; color: #0f172a; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .section-header { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; letter-spacing: 0.5px; }
            .info-row { display: flex; margin-bottom: 8px; font-size: 14px; align-items: baseline; }
            .info-label { width: 90px; font-weight: 600; color: #64748b; font-size: 13px; flex-shrink: 0; }
            .info-val { flex: 1; font-weight: 500; color: #334155; }
            .cost-table { width: 100%; border-collapse: collapse; }
            .cost-table th { background: #f8fafc; padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
            .cost-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
            .text-right { text-align: right; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: -0.5px; }
            .totals-container { display: flex; justify-content: flex-end; margin-bottom: 40px; margin-top: 30px; }
            .totals-box { width: 350px; background: #f8fafc; border-radius: 8px; overflow: hidden; padding: 10px; border: 1px solid #e2e8f0; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .total-row.main { background: #e2e8f0; font-weight: 800; color: #0f172a; font-size: 15px; border-radius: 4px; }
            .status-badge { font-weight: 800; font-size: 14px; padding: 6px 15px; border-radius: 20px; display: inline-block; width: 100%; text-align: center; }
            .lunas { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .belum { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .footer { font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 25px; }
            .footer-title { font-weight: 700; margin-bottom: 5px; color: #475569; text-transform: uppercase; font-size: 11px; }
            @media print {
                body { padding: 0; margin: 20px; }
                .invoice-title { -webkit-print-color-adjust: exact; }
                .lunas, .belum, .header, .cost-table th, .total-row.main { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
           <div class="header">
             <div class="company-info">
               ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" alt="Logo"/>` : ''}
               <div class="company-name">${settings.companyName || 'NAMA PERUSAHAAN'}</div>
               <div class="tagline">${settings.tagline || 'Rental Mobil Terpercaya'}</div>
               <div class="address">
                 ${settings.address || 'Alamat Perusahaan'}<br>
                 ${settings.phone || 'Telp'} | ${settings.email || 'Email'}
               </div>
             </div>
             <div class="invoice-details">
                <div class="invoice-title">INVOICE</div>
                <table class="meta-table">
                    <tr><td class="meta-label">Nomor :</td><td class="meta-val">#${booking.id.slice(0, 8).toUpperCase()}</td></tr>
                    <tr><td class="meta-label">Tanggal :</td><td class="meta-val">${formatDate(new Date().toISOString())}</td></tr>
                </table>
             </div>
           </div>

           <div class="info-grid">
             <div class="section-box">
                <div class="section-header">KEPADA YTH (PENYEWA):</div>
                <div class="info-row"><div class="info-label">Nama</div><div class="info-val">: ${booking.customers?.full_name || '-'}</div></div>
                <div class="info-row"><div class="info-label">No. WA / HP</div><div class="info-val">: ${booking.customers?.phone || '-'}</div></div>
                <div class="info-row"><div class="info-label">Alamat</div><div class="info-val">: ${booking.customers?.address || '-'}</div></div>
                <div class="info-row"><div class="info-label">Tgl. Ambil</div><div class="info-val">: ${formatDateTime(booking.start_date)}</div></div>
                <div class="info-row"><div class="info-label">Tgl. Kembali</div><div class="info-val">: ${formatDateTime(booking.end_date)}</div></div>
             </div>
             <div class="section-box">
                <div class="section-header">DETAIL KENDARAAN:</div>
                <div class="info-row"><div class="info-label">Unit</div><div class="info-val">: ${booking.cars?.brand} ${booking.cars?.model}</div></div>
                <div class="info-row"><div class="info-label">Nopol</div><div class="info-val">: ${booking.cars?.license_plate}</div></div>
                <div class="info-row"><div class="info-label">Paket</div><div class="info-val">: ${booking.rental_package || '-'}</div></div>
                <div class="info-row"><div class="info-label">Durasi</div><div class="info-val">: ${days} Hari</div></div>
             </div>
           </div>

           <div class="table-container">
             <table class="cost-table">
                <thead>
                    <tr>
                        <th width="40%">Deskripsi</th>
                        <th width="30%">Detail</th>
                        <th width="30%" class="text-right">Jumlah (Rp)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Sewa Unit</td>
                        <td>Harga harian x ${days} hari</td>
                        <td class="text-right font-mono">${totalSewaUnit.toLocaleString('id-ID')}</td>
                    </tr>
                    ${driverCost > 0 ? `
                    <tr>
                        <td>Driver</td>
                        <td>${driverDesc}</td>
                        <td class="text-right font-mono">${driverCost.toLocaleString('id-ID')}</td>
                    </tr>` : ''}
                    ${deliveryFee > 0 ? `
                    <tr>
                        <td>Jasa Antar/Ambil</td>
                        <td>Delivery Fee</td>
                        <td class="text-right font-mono">${deliveryFee.toLocaleString('id-ID')}</td>
                    </tr>` : ''}
                    ${overdueFee > 0 ? `
                    <tr>
                        <td>Overtime</td>
                        <td>Denda Keterlambatan</td>
                        <td class="text-right font-mono">${overdueFee.toLocaleString('id-ID')}</td>
                    </tr>` : ''}
                    ${extraFee > 0 ? `
                    <tr>
                        <td>Biaya Extra</td>
                        <td>${booking.extra_fee_reason || 'Lain-lain'}</td>
                        <td class="text-right font-mono">${extraFee.toLocaleString('id-ID')}</td>
                    </tr>` : ''}
                </tbody>
             </table>
           </div>

           <div class="totals-container">
             <div class="totals-box">
                <div class="total-row main">
                    <div>TOTAL TAGIHAN</div>
                    <div>Rp ${booking.total_price.toLocaleString('id-ID')}</div>
                </div>
                <div class="total-row">
                    <div class="total-label">Pembayaran Masuk</div>
                    <div class="font-mono">Rp ${(booking.amount_paid || 0).toLocaleString('id-ID')}</div>
                </div>
                <div class="total-row">
                    <div class="total-label">SISA TAGIHAN</div>
                    <div class="font-mono" style="color: ${remaining > 0 ? '#b91c1c' : '#15803d'}">Rp ${remaining.toLocaleString('id-ID')}</div>
                </div>
                <div style="padding: 15px; text-align: center;">
                    <span class="status-badge ${isLunas ? 'lunas' : 'belum'}">
                        STATUS: ${isLunas ? 'LUNAS' : 'BELUM LUNAS'}
                    </span>
                </div>
             </div>
           </div>

           <div class="footer">
             <div style="margin-bottom: 15px;">
                <div class="footer-title">Keterangan:</div>
                <p>${booking.notes || '-'}</p>
             </div>
             <div style="margin-bottom: 15px;">
                <div class="footer-title">KETENTUAN PEMBAYARAN:</div>
                <p>${settings.invoiceFooter || 'Harap melakukan pelunasan sebelum pengambilan unit.'}</p>
             </div>
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
            <Link to="/dashboard/bookings/new" className="w-full sm:w-auto">
                <Button className="!w-full sm:!w-auto flex items-center justify-center"><i className="fas fa-plus mr-2"></i> Buat Order Baru</Button>
            </Link>
        </div>

        {/* Filter Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-3">
             <div className="flex items-center gap-2 text-slate-500 text-sm font-bold w-full md:w-auto">
                 <Filter size={16}/> FILTER:
             </div>
             
             <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                 <input 
                    type="date" 
                    className="w-full sm:w-auto border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                 />
                 <span className="text-slate-400 text-sm hidden sm:inline">s/d</span>
                 <input 
                    type="date" 
                    className="w-full sm:w-auto border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
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
                 <option value={BookingStatus.CONFIRMED}>BOOKED (Baru)</option>
                 <option value={BookingStatus.ACTIVE}>ACTIVE (Jalan)</option>
                 <option value={BookingStatus.COMPLETED}>COMPLETED (Selesai)</option>
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
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 flex-shrink-0 hidden sm:flex">
                                    <CarIcon size={24} />
                                </div>
                                <div className="w-full">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 uppercase leading-tight">{booking.cars?.brand} {booking.cars?.model}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded border border-slate-200">
                                                    {booking.cars?.license_plate}
                                                </span>
                                                {/* Review Pending Indicator */}
                                                {booking.status === BookingStatus.COMPLETED && booking.review_token && (
                                                    <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                        <Star size={10} className="fill-yellow-600 text-yellow-600"/> Menunggu Review
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${statusStyle.badge}`}>
                                            {statusStyle.label}
                                        </span>
                                    </div>
                                    
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-3 gap-x-4 mt-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar size={16} className="text-blue-500 flex-shrink-0"/>
                                            <span className="font-medium truncate">{formatDate(booking.start_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Clock size={16} className="text-orange-500 flex-shrink-0"/>
                                            <span className="font-bold text-orange-600 uppercase">{getDurationDays(booking.start_date, booking.end_date)} HARI</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 col-span-2 sm:col-span-1">
                                            <User size={16} className="text-blue-500 flex-shrink-0"/>
                                            <span className="font-bold text-blue-600 uppercase text-xs truncate">{booking.customers?.full_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 col-span-2 sm:col-span-1">
                                            <span className="font-bold text-red-600">Rp {booking.total_price.toLocaleString('id-ID')}</span>
                                            {remaining > 0 && (
                                                <span className="text-[10px] text-red-400 font-medium whitespace-nowrap">(Sisa: {remaining.toLocaleString('id-ID')})</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                                        
                                        {/* 1. Payment Action */}
                                        {booking.status !== BookingStatus.CANCELLED && (
                                            <button 
                                                onClick={() => !isPaidOff && handleLunasi(booking)}
                                                disabled={isPaidOff}
                                                className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded text-xs font-bold text-white flex items-center gap-1 shadow-sm ${isPaidOff ? 'bg-green-600 cursor-default opacity-80' : 'bg-green-50 hover:bg-green-600 text-green-700 hover:text-white border border-green-200 hover:border-transparent'}`}
                                            >
                                                {isPaidOff ? <CheckCircle size={14}/> : null}
                                                {isPaidOff ? 'LUNAS' : 'BAYAR'}
                                            </button>
                                        )}

                                        {/* 2. Checklist Action (Main Status Trigger) */}
                                        {booking.status !== BookingStatus.CANCELLED && (
                                            <button 
                                                onClick={() => handleChecklist(booking)} 
                                                className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded text-xs font-bold text-white shadow-sm flex items-center gap-1 ${booking.status === BookingStatus.ACTIVE ? 'bg-indigo-600 hover:bg-indigo-700' : booking.status === BookingStatus.COMPLETED ? 'bg-slate-500 hover:bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                                            >
                                                <ClipboardCheck size={14}/> 
                                                {booking.status === BookingStatus.CONFIRMED ? 'CHECKLIST' : booking.status === BookingStatus.ACTIVE ? 'SELESAI' : 'CHECKLIST'}
                                            </button>
                                        )}

                                        {/* 3. Cancel Action (Only for Booked) */}
                                        {booking.status === BookingStatus.CONFIRMED && (
                                             <button 
                                                onClick={() => handleStatusChange(booking.id, BookingStatus.CANCELLED)}
                                                className="px-4 py-2 rounded text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 shadow-sm flex items-center gap-1"
                                             >
                                                <XCircle size={14}/> BATAL
                                             </button>
                                        )}

                                        <div className="hidden sm:block w-px h-6 bg-slate-200 mx-2"></div>
                                        
                                        <button 
                                            onClick={() => handleWhatsApp(booking)} 
                                            className={`flex-1 sm:flex-none justify-center px-3 py-2 rounded text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 flex items-center gap-1 transition-colors ${booking.status === BookingStatus.COMPLETED && booking.review_token ? 'ring-2 ring-green-300 ring-offset-1' : ''}`}
                                            title={booking.status === BookingStatus.COMPLETED ? "Kirim Invoice & Link Review" : "Kirim Pesan WA"}
                                        >
                                            <MessageCircle size={14}/> WA {booking.status === BookingStatus.COMPLETED && booking.review_token ? '+ Review' : ''}
                                        </button>
                                        
                                        {/* PDF Dropdown */}
                                        <div className="relative flex-1 sm:flex-none">
                                            <button 
                                                onClick={() => setOpenDropdownId(openDropdownId === booking.id ? null : booking.id)}
                                                className="w-full justify-center px-3 py-2 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors"
                                            >
                                                <FileText size={14}/> Invoice <ChevronDown size={12}/>
                                            </button>
                                            
                                            {openDropdownId === booking.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                                                    <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-20 overflow-hidden">
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
                                        
                                        <div className="flex-1 sm:hidden"></div>

                                        <div className="flex gap-1 ml-auto">
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

      <ChecklistModal 
        isOpen={!!checklistBooking} 
        onClose={() => setChecklistBooking(null)} 
        booking={checklistBooking} 
        onSave={() => { fetchBookings(); }} 
      />
    </div>
  );
};
