
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { bookingService } from '../../service/bookingService';
import { reviewService } from '../../service/reviewService';
import { PublicReviewData } from '../../types';
import { StarRating } from '../../components/StarRating';
import { CheckCircle, AlertCircle, Car as CarIcon, Building, User } from 'lucide-react';

export const PublicReviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const [reviewData, setReviewData] = useState<PublicReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for ratings
  const [carRating, setCarRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [comment, setComment] = useState('');
  
  const [submitted, setSubmitted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!token) {
        setError("Token tidak ditemukan.");
        setLoading(false);
        return;
    }

    const fetchBooking = async () => {
        try {
            const data = await bookingService.getBookingByToken(token);
            setReviewData(data);
        } catch (err: any) {
            console.error(err);
            setError("Link penilaian tidak valid atau sudah kadaluarsa.");
        } finally {
            setLoading(false);
        }
    };

    fetchBooking();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Basic Validation
      if (carRating === 0) {
          alert("Mohon berikan penilaian untuk Mobil.");
          return;
      }
      
      if (reviewData?.driver_name && driverRating === 0) {
          if (!window.confirm("Anda belum menilai Driver. Lanjutkan tanpa nilai driver?")) return;
      }
      
      setSubmitLoading(true);
      try {
          if(!token) throw new Error("Token missing");
          
          await reviewService.submitPublicReview(token, carRating, driverRating || 0, comment);
          setSubmitted(true);
      } catch (err: any) {
          alert(err.message || "Gagal mengirim penilaian.");
      } finally {
          setSubmitLoading(false);
      }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          </div>
      );
  }

  if (error) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} className="text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Link Tidak Valid</h2>
                  <p className="text-slate-500">{error}</p>
              </div>
          </div>
      );
  }

  if (submitted) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Terima Kasih!</h2>
                  <p className="text-slate-600">
                      Penilaian Anda telah kami terima dan sangat berarti untuk meningkatkan kualitas layanan kami.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            {/* Header / Brand */}
            <div className="bg-slate-900 p-6 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-20 h-20 bg-blue-500 rounded-full blur-2xl -ml-10 -mt-10 opacity-50"></div>
                <div className="relative z-10">
                    {reviewData?.company_logo ? (
                        <img src={reviewData.company_logo} className="h-12 mx-auto mb-3 object-contain" alt="Logo"/>
                    ) : (
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <Building className="text-white" size={24}/>
                        </div>
                    )}
                    <h1 className="text-lg font-bold tracking-wide">{reviewData?.company_name || 'ASPERDA Rental'}</h1>
                    <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Form Kepuasan Pelanggan</p>
                </div>
            </div>

            <div className="p-8">
                {/* Details */}
                <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Halo,</p>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{reviewData?.customer_name}</h3>
                    
                    <div className="space-y-2">
                        {/* Car Info */}
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                                <CarIcon size={18}/>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Unit Disewa</p>
                                <p className="font-semibold">{reviewData?.car_brand} {reviewData?.car_model}</p>
                            </div>
                        </div>

                        {/* Driver Info (If any) */}
                        {reviewData?.driver_name && (
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <div className="p-2 bg-green-50 rounded-full text-green-600">
                                    <User size={18}/>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">Driver Bertugas</p>
                                    <p className="font-semibold">{reviewData.driver_name}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* 1. Car Rating */}
                    <div className="text-center">
                        <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center justify-center gap-2">
                            <CarIcon size={16} className="text-blue-600"/> Bagaimana kualitas mobilnya?
                        </label>
                        <div className="flex justify-center">
                            <StarRating rating={carRating} onRatingChange={setCarRating} size={40} />
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">
                            {carRating === 5 ? 'Sempurna!' : carRating === 4 ? 'Sangat Baik' : carRating === 3 ? 'Cukup' : carRating > 0 ? 'Kurang' : 'Sentuh bintang untuk menilai'}
                        </p>
                    </div>

                    {/* 2. Driver Rating (Conditional) */}
                    {reviewData?.driver_name && (
                        <div className="text-center pt-6 border-t border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center justify-center gap-2">
                                <User size={16} className="text-green-600"/> Bagaimana pelayanan driver?
                            </label>
                            <div className="flex justify-center">
                                <StarRating rating={driverRating} onRatingChange={setDriverRating} size={40} />
                            </div>
                            <p className="text-xs text-slate-400 mt-2 font-medium">
                                {driverRating === 5 ? 'Sangat Ramah & Profesional' : driverRating === 4 ? 'Baik' : driverRating > 0 ? 'Kurang Memuaskan' : 'Sentuh bintang untuk menilai'}
                            </p>
                        </div>
                    )}

                    {/* Comment */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Kritik & Saran (Opsional)</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            rows={3}
                            placeholder="Ceritakan pengalaman Anda..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        ></textarea>
                    </div>

                    <button 
                        type="submit" 
                        disabled={submitLoading || carRating === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        {submitLoading ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Mengirim...</>
                        ) : (
                            'Kirim Penilaian'
                        )}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
