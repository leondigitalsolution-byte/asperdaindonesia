
import { supabase } from './supabaseClient';

export const reviewService = {
  /**
   * Submit a review for a booking using the RPC function.
   * This transaction will insert the review AND invalidate the token atomically.
   */
  submitPublicReview: async (token: string, carRating: number, driverRating: number | null, comment: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('submit_public_review', {
        p_token: token,
        p_car_rating: carRating,
        p_driver_rating: driverRating || 0, // 0 means no driver rated
        p_comment: comment
      });

      if (error) throw error;
      return data; // Returns true if success, false if token invalid
    } catch (err: any) {
      console.error("Submit Review Error:", err);
      throw new Error("Gagal mengirim review. Token mungkin sudah tidak valid.");
    }
  }
};
