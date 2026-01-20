
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  DPC_ADMIN = 'dpc_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  DRIVER = 'driver',
  MITRA = 'mitra',
  PARTNER = 'partner'
}

export enum MembershipStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export enum CarStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

export enum Transmission {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DriverOption {
  LEPAS_KUNCI = 'lepas_kunci',
  WITH_DRIVER = 'with_driver',
}

export enum FinanceType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum CarOwnerType {
  OWN = 'own',
  PARTNER = 'partner',
}

// --- NEW PAYMENT TYPES ---
export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
  QRIS = 'qris',
  PAYLATER = 'paylater'
}

// --- NEW COMPLIANCE TYPES ---
export enum PayoutStatus {
  UNPAID = 'unpaid',
  PROCESSING = 'processing',
  PAID = 'paid',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export enum DisputeStatus {
  NONE = 'none',
  OPEN = 'open',
  RESOLVED_REFUND = 'resolved_refund',
  RESOLVED_PAYOUT = 'resolved_payout'
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  BLACKLISTED = 'blacklisted'
}

// --- R2R MARKETPLACE TYPES ---
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface MarketplaceRequest {
  id: string;
  requester_company_id: string;
  supplier_company_id: string;
  car_id: string;
  driver_id?: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: RequestStatus;
  created_at: string;
  
  // Joins
  cars?: Car;
  requester?: Company; // Joined from companies table
  drivers?: Driver;
}
// -----------------------------

export type PayLaterTerm = 1 | 3 | 6 | 12;

export interface PayLaterRecord {
  id: string;
  booking_id: string;
  company_id: string; // Rental Company
  dpc_id: string; // Region responsible
  customer_id: string;
  total_amount: number;
  term_months: number; // 1, 3, 6, 12
  monthly_installment: number;
  due_date_day: number; // Always 1
  start_date: string;
  status: 'active' | 'paid_off' | 'default';
  created_at: string;
  // Joins
  bookings?: Booking;
  companies?: Company;
  customers?: Customer;
  dpc_regions?: DpcRegion;
}
// --------------------------

export type MarkupType = 'Nominal' | 'Percent';

export interface FuelType {
  name: string;
  price: number;
  category?: 'Gasoline' | 'Gasoil' | 'Electric';
}

export interface TollRate {
  id: string;
  name: string;
  price: number;
}

export interface CoverageArea {
  id: string;
  name: string; 
  description: string; 
  extraPrice: number; 
  extraDriverPrice: number; 
}

export interface AppSettings {
    driverShortDistanceLimit: number;
    driverShortDistancePrice: number;
    driverLongDistanceLimit: number;
    driverLongDistancePrice: number;
    driverOvernightPrice: number; 
    agentMarkupValue: number;
    agentMarkupType: MarkupType;
    customerMarkupValue: number;
    customerMarkupType: MarkupType;
    fuelTypes: FuelType[];
    tollRates: TollRate[];
    companyName?: string;
    displayName?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    themeColor?: string;
    darkMode?: boolean;
    invoiceFooter?: string;
    
    // Global Styling
    globalLogoUrl?: string;
    globalBackgroundUrl?: string;
    
    // Auth Page Customization
    authTitle?: string;
    authSubtitle?: string;
    authQuote?: string;

    carCategories: string[];
    rentalPackages: string[];
    coverageAreas: CoverageArea[]; 
    gpsProvider?: string;
    gpsApiUrl?: string;
    gpsApiToken?: string;
}

export interface DpcRegion {
  id: string;
  name: string;
  province: string;
  created_at?: string;
}

export interface Company {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  address: string;
  dpc_id: string;
  logo_url?: string;
  membership_status: MembershipStatus;
  
  // New Compliance Fields
  verification_status?: VerificationStatus | string;
  kpi_response_time_minutes?: number;
  kpi_cancellation_rate?: number;
  kpi_order_success_ratio?: number;
  kpi_rating?: number;

  created_at?: string;
  dpc_regions?: DpcRegion;
}

export interface Profile {
  id: string; 
  full_name: string;
  email: string;
  role: UserRole;
  company_id?: string;
  
  // Consent
  agreed_terms_version?: string;
  agreed_at?: string;
  
  created_at?: string;
}

export interface User {
    id: string;
    name: string;
    username: string; 
    password?: string;
    role: UserRole;
    phone?: string;
    email?: string;
    image?: string | null;
    linkedPartnerId?: string;
    linkedDriverId?: string;
}

export interface Partner {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  profit_sharing_percentage?: number; 
  image_url?: string;
  created_at?: string;
  cars?: Car[];
}

export interface Driver {
  id: string;
  company_id: string;
  full_name: string;
  phone: string;
  sim_number?: string;
  status: 'active' | 'inactive' | 'on_duty';
  dailyRate?: number;
  image_url?: string;
  rating?: number; // New Rating Field
  review_count?: number; // New Review Count
  created_at?: string;
}

export type MaintenanceType = 'service' | 'oil' | 'oil_filter' | 'fuel_filter' | 'tires';

export interface MaintenanceRecord {
  type: MaintenanceType;
  last_odometer: number;
  interval: number;
}

export interface CarGallery {
    front?: string;
    back?: string;
    right?: string;
    left?: string;
    interior_dash?: string;
    interior_seats?: string;
    interior_trunk?: string;
    detail_engine?: string;
}

export interface Car {
  id: string;
  company_id: string;
  partner_id?: string | null;
  owner_type: CarOwnerType;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  transmission: Transmission;
  status: CarStatus;
  price_per_day: number;
  driver_daily_salary?: number; 
  image_url?: string;
  category?: string;
  fuel_type?: string; 
  fuel_ratio?: number;
  current_odometer?: number;
  maintenance?: MaintenanceRecord[];
  gps_device_id?: string;
  
  is_marketplace_ready?: boolean; 
  
  // New Compliance & Ratings & Gallery
  stnk_expiry_date?: string;
  cleanliness_rating?: number;
  average_rating?: number;
  review_count?: number; // New Review Count
  
  description?: string;
  gallery?: CarGallery;

  created_at?: string;
  partners?: Partner;
  companies?: Company; // For Marketplace Join
  pricing?: {[key: string]: number}; 
}

export interface Customer {
  id: string;
  company_id: string;
  full_name: string;
  nik: string;
  phone: string;
  address?: string;
  is_blacklisted: boolean;
  created_at?: string;
}

export interface BookingChecklist {
  km: number;
  fuel: string; 
  images: {
    front?: string;
    back?: string;
    left?: string;
    right?: string;
    dashboard?: string;
  };
  notes?: string;
}

export interface Booking {
  id: string;
  company_id: string;
  car_id: string;
  customer_id: string;
  driver_id?: string;
  start_date: string;
  end_date: string;
  total_price: number;
  delivery_fee?: number; 
  amount_paid?: number; 
  status: BookingStatus;
  driver_option: DriverOption;
  rental_package?: string; 
  destination?: string; 
  notes?: string;
  deposit_type?: 'barang' | 'uang';
  deposit_description?: string;
  deposit_value?: number;
  deposit_image_url?: string;
  start_checklist?: BookingChecklist;
  return_checklist?: BookingChecklist;
  actual_return_date?: string;
  overdue_fee?: number;
  extra_fee?: number;
  extra_fee_reason?: string;
  payment_method?: PaymentMethod; 
  
  // New Marketplace & Compliance
  supplier_company_id?: string;
  commission_rate?: number;
  commission_amount?: number;
  payout_status?: PayoutStatus;
  dispute_status?: DisputeStatus;
  refund_status?: string;
  insurance_claim_status?: string;
  
  // Review System
  review_token?: string | null;

  created_at?: string;
  cars?: Car;
  customers?: Customer;
  drivers?: Driver; 
  companies?: Company;
}

export interface Review {
  id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Display interface for RPC `get_car_reviews`
export interface ReviewDisplay {
    reviewer_name: string;
    rating: number;
    comment: string;
    created_at: string;
}

export interface DamageReport {
  id: string;
  booking_id: string;
  company_id: string;
  reported_at: string;
  description: string;
  evidence_photos: string[];
  estimated_cost: number;
  final_cost: number;
  status: string;
  created_at?: string;
}

export interface KycDocument {
  id: string;
  company_id: string;
  document_type: string;
  document_number?: string;
  file_url: string;
  status: string;
  rejection_reason?: string;
  uploaded_at: string;
  verified_at?: string;
}

export interface FinanceRecord {
  id: string;
  company_id: string;
  transaction_date: string;
  type: FinanceType;
  category: string;
  amount: number;
  description?: string;
  proof_image_url?: string;
  status?: 'paid' | 'pending';
  created_at?: string;
}

export interface RegistrationFormData {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  phone: string;
  address: string;
  dpcId: string;
}

// Deprecated in V2 but kept for type compatibility if needed temporarily
export interface MarketplacePost {
  id: string;
  company_id: string;
  type: 'offering' | 'looking';
  title: string;
  description: string;
  price: number;
  date_needed: string;
  created_at?: string;
  companies?: Company;
}

export interface GlobalBlacklist {
  id: string;
  full_name: string;
  nik: string;
  phone: string;
  reason: string;
  evidence_url?: string;
  reported_by_company_id?: string;
  created_at: string;
}

export interface BlacklistReport {
  id: string;
  reported_by_company_id: string;
  target_name: string;
  target_nik: string;
  target_phone: string;
  reason: string;
  evidence_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  companies?: Company; 
}

export interface HighSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priceIncrease: number;
}

export interface CoopMember {
  id: string;
  user_id?: string; 
  member_id: string; 
  username: string;
  full_name: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
  city: string;
  department: string; 
  join_date: string; 
  status: 'Aktif' | 'Non-Aktif' | 'Pending';
  photo_url?: string;
  dpc_id: string; 
  created_at?: string;
  dpc_regions?: DpcRegion;
}

export interface PublicReviewData {
  booking_id: string;
  customer_name: string;
  car_brand: string;
  car_model: string;
  car_image?: string;
  company_name: string;
  company_logo?: string;
  driver_name?: string; 
}