export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string; // ISO format YYYY-MM-DD
  travelType: 'solo' | 'family' | 'business' | 'leisure' | 'adventure' | 'backpacking';
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  totalBudget?: number;
  budgetCurrency?: string;
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  tripId: string;
  dayIndex: number; // 1-based index or date
  date?: string;
  time?: string;
  title: string;
  location?: string;
  notes?: string;
  completed: boolean;
}

export interface ChecklistItem {
  id: string;
  tripId?: string; // Optional if generic
  category: 'essentials' | 'clothing' | 'electronics' | 'documents' | 'health' | 'toiletries' | 'custom';
  title: string;
  isPacked: boolean;
  quantity?: number;
  notes?: string;
  suggestedBy?: 'weather' | 'destination' | 'duration' | 'travel_type' | 'user';
}

export interface StoredDocument {
  id: string;
  name: string;
  category: 'passport' | 'visa' | 'ticket' | 'id_card' | 'insurance' | 'hotel' | 'other';
  documentNumber?: string;
  expiryDate?: string;
  mimeType: string;
  fileSize: number;
  encryptedBlob?: ArrayBuffer | string; // AES-GCM encrypted content
  iv?: string; // base64 encoded IV
  isArchived: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  tripId?: string;
  amount: number;
  currency: string;
  convertedAmount: number; // converted to user's base currency
  baseCurrency: string;
  exchangeRate: number;
  category: 'food' | 'transport' | 'lodging' | 'entertainment' | 'shopping' | 'emergency' | 'other';
  date: string; // ISO format
  description: string;
  paymentMethod: 'cash' | 'card' | 'mobile_pay';
  paidBy?: string;
  splitWith?: string[];
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  notifyOnSOS: boolean;
}

export interface EmergencyProfile {
  id: string;
  fullName: string;
  bloodType: string;
  allergies: string[];
  medications: string[];
  medicalConditions: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyContacts: EmergencyContact[];
  specialInstructions?: string;
  updatedAt: string;
}

export interface LocationSharePayload {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  batteryLevel?: number;
  emergencyAlert: boolean;
  note?: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: 'hospital' | 'pharmacy' | 'police' | 'atm' | 'restaurant' | 'accommodation' | 'embassy' | 'attraction';
  address: string;
  distanceMeters: number;
  phoneNumber?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  open24Hours: boolean;
  notes?: string;
}

export interface TranslationPhrase {
  id: string;
  category: 'emergency' | 'medical' | 'transport' | 'directions' | 'dining' | 'greetings' | 'common';
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  phoneticPronunciation?: string;
  isFavorite: boolean;
  isEmergencyPhrase: boolean;
}
