export type ServiceCategory = 'package' | 'flower' | 'candle' | 'addon' | 'grave_type';

export interface ServiceItem {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string;
  price: number; // w PLN
  badge?: string;
  isActive: boolean;
}

export interface Cemetery {
  id: string;
  city: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  grobonetUrl: string;
  googleMapsUrl: string;
}

export interface TimeSlot {
  id: string; // format: YYYY-MM-DD_HH:MM
  date: string;
  time: string;
  maxCapacity: number;
  bookedCount: number;
  isBlocked: boolean;
  status: 'available' | 'last_spot' | 'sold_out';
}

export interface OrderAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string; // format: CP-101
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  city: string;
  cemeteryId: string;
  cemeteryName: string;
  graveType: string;
  graveLocationMode: 'deceased' | 'photo' | 'sector';
  deceasedName?: string;
  sectorInfo?: string;
  gravePhotoDataUrl?: string;
  grobonetLink?: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  addons: OrderAddon[];
  totalPrice: number;
  discountApplied: number;
  slotDate: string;
  slotTime: string;
  paymentMethod: 'blik_manual' | 'stripe';
  status: 'pending_blik' | 'paid' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  contractorToken: string;
  contractorNotes?: string;
  photoBeforeDataUrl?: string;
  photoAfterDataUrl?: string;
  completedAt?: string;
}

export interface SystemSettings {
  blikPhone: string;
  blikRecipient: string;
  adminPin: string;
  promoCode: string;
  promoDiscountPercent: number;
  multiGraveDiscountPercent: number;
  bannerText: string;
  stripeEnabled: boolean;
}
