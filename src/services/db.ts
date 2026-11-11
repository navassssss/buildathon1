import Dexie, { type Table } from 'dexie';
import type {
  Trip,
  Activity,
  ChecklistItem,
  StoredDocument,
  Expense,
  EmergencyProfile,
  NearbyPlace,
  TranslationPhrase,
} from '../types';

export class TravellerDatabase extends Dexie {
  trips!: Table<Trip, string>;
  activities!: Table<Activity, string>;
  checklists!: Table<ChecklistItem, string>;
  documents!: Table<StoredDocument, string>;
  expenses!: Table<Expense, string>;
  emergencyProfiles!: Table<EmergencyProfile, string>;
  nearbyPlaces!: Table<NearbyPlace, string>;
  translationPhrases!: Table<TranslationPhrase, string>;

  constructor() {
    super('TravellerCompanionDB');
    this.version(1).stores({
      trips: 'id, title, destination, startDate, endDate, status, travelType',
      activities: 'id, tripId, dayIndex, completed',
      checklists: 'id, tripId, category, isPacked',
      documents: 'id, name, category, expiryDate, isArchived',
      expenses: 'id, tripId, category, date, currency',
      emergencyProfiles: 'id, fullName',
      nearbyPlaces: 'id, category, name, distanceMeters',
      translationPhrases: 'id, category, sourceLanguage, targetLanguage, isFavorite, isEmergencyPhrase',
    });
  }
}

export const db = new TravellerDatabase();
