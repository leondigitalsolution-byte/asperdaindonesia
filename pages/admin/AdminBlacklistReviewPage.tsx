
import React, { useEffect, useState } from 'react';
import { adminService } from '../../service/adminService';
import { BlacklistReport } from '../../types';

export const AdminBlacklistReviewPage: React.FC = () => {
  const [reports, setReports] = useState<BlacklistReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await adminService.getBlacklistReports();
      setReports(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processReport = async (report: BlacklistReport, action: 'approve' | 'reject') => {
    const confirmMsg = action === 'approve' 
      ? `Validasi laporan ini? Data akan masuk ke Global Blacklist dan dapat dilihat semua member.` 
      : `Tolak laporan ini? Data akan dihapus dari antrian.`;
    
    if(!window.confirm(confirmMsg)) return;

    try {
      await adminService.processBlacklistReport(report, action);
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-amber-500 pl-4">
        <h1 className="text-2xl font-bold text-slate-900">Review Laporan Blacklist</h1>
        <p className="text-slate-500 text-sm">Validasi laporan member sebelum dipublikasikan ke Global Blacklist.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
           <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
             <i className="fas fa-spinner fa-spin mr-2"></i> Memuat laporan...
           </div>
        ) : reports.length === 0 ? (
           <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
             <i className="fas fa-shield-alt text-4xl text-green-500 mb-3"></i>
             <p>Tidak ada laporan blacklist baru yang perlu direview.</p>
           </div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Pending Review</span>
                   <span className="text-xs text-slate-500">Dilaporkan oleh: <strong>{report.companies?.name || 'Unknown Member'}</strong></span>
                 </div>
                 <div className="text-xs text-slate-400">
                    {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                 </div>
               </div>
               
               <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Target Info */}
                  <div className="md:col-span-2 space-y-4">
                     <div>
                        <h3 className="text-lg font-bold text-slate-900">{report.target_name}</h3>
                        <div className="flex gap-4 mt-1 text-sm text-slate-600">
                           <span><i className="fas fa-id-card mr-1"></i> {report.target_nik}</span>
                           <span><i className="fas fa-phone mr-1"></i> {report.target_phone}</span>
                        </div>
                     </div>
                     <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <h4 className="text-xs font-bold text-red-700 uppercase mb-1">Kronologi / Masalah</h4>
                        <p className="text-slate-800 text-sm">{report.reason}</p>
                     </div>
                  </div>

                  {/* Evidence & Action */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-100 rounded-lg p-2 h-32 flex items-center justify-center overflow-hidden border border-slate-200">
                       {report.evidence_url ? (
                         <a href={report.evidence_url} target="_blank" rel="noreferrer">
                           <img src={report.evidence_url} alt="Bukti" className="h-full object-cover hover:scale-110 transition-transform cursor-zoom-in" />
                         </a>
                       ) : (
                         <span className="text-xs text-slate-400">Tidak ada bukti foto</span>
                       )}
                    </div>
                    <div className="flex flex-col gap-2 mt-auto">
                       <button 
                         onClick={() => processReport(report, 'approve')}
                         className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm transition-colors shadow-sm"
                       >
                         <i className="fas fa-exclamation-triangle mr-1"></i> Validasi (Blacklist)
                       </button>
                       <button 
                         onClick={() => processReport(report, 'reject')}
                         className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium text-sm transition-colors"
                       >
                         Tolak Laporan
                       </button>
                    </div>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
