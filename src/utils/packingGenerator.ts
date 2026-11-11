import type { ChecklistItem, Trip } from '../types';

export type WeatherType = 'sunny' | 'rainy' | 'cold' | 'hot' | 'snowy' | 'mild';

export interface PackingRuleInput {
  destination: string;
  weather: WeatherType;
  durationDays: number;
  travelType: Trip['travelType'];
  tripId?: string;
}

function generateId(prefix: string = 'chk'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateSuggestedPackingItems(input: PackingRuleInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  const add = (
    category: ChecklistItem['category'],
    title: string,
    suggestedBy: ChecklistItem['suggestedBy'],
    quantity: number = 1
  ) => {
    // Avoid duplicates by title
    if (!items.some((i) => i.title.toLowerCase() === title.toLowerCase())) {
      items.push({
        id: generateId(),
        tripId: input.tripId,
        category,
        title,
        isPacked: false,
        quantity,
        suggestedBy,
      });
    }
  };

  // 1. Universal Essentials
  add('documents', 'Passport / Government ID', 'destination', 1);
  add('documents', 'Boarding pass / Travel tickets', 'destination', 1);
  add('documents', 'Hotel reservation confirmation', 'destination', 1);
  add('documents', 'Emergency contact card', 'destination', 1);
  add('essentials', 'Wallet, credit cards & local cash', 'destination', 1);
  add('electronics', 'Smartphone & charging cable', 'destination', 1);
  add('electronics', 'Universal power adapter', 'destination', 1);
  add('electronics', 'Portable power bank (10,000mAh+)', 'destination', 1);
  add('health', 'Personal prescription medications', 'destination', 1);
  add('toiletries', 'Toothbrush & toothpaste', 'destination', 1);

  // 2. Duration-based items
  const shirtsCount = Math.max(3, Math.min(input.durationDays, 7));
  const underwearCount = Math.max(3, Math.min(input.durationDays + 1, 8));
  add('clothing', `${shirtsCount}x T-shirts / Shirts`, 'duration', shirtsCount);
  add('clothing', `${underwearCount}x Underwear & socks`, 'duration', underwearCount);
  add('clothing', 'Sleepwear / Pajamas', 'duration', 2);
  if (input.durationDays >= 5) {
    add('essentials', 'Laundry detergent sheets / Travel wash', 'duration', 1);
    add('essentials', 'Compact travel luggage lock', 'duration', 2);
  }

  // 3. Weather-based items
  switch (input.weather) {
    case 'cold':
    case 'snowy':
      add('clothing', 'Thermal base layers (top & bottom)', 'weather', 2);
      add('clothing', 'Heavy insulated coat / Parka', 'weather', 1);
      add('clothing', 'Fleece sweaters / Hoodies', 'weather', 2);
      add('clothing', 'Warm beanie & wool scarf', 'weather', 1);
      add('clothing', 'Waterproof insulated gloves', 'weather', 1);
      add('clothing', 'Warm thermal wool socks', 'weather', 3);
      add('clothing', 'Waterproof winter boots', 'weather', 1);
      add('health', 'Moisturizing lip balm & dry skin lotion', 'weather', 1);
      break;

    case 'hot':
    case 'sunny':
      add('clothing', 'Lightweight breathable shorts/skirts', 'weather', 3);
      add('clothing', 'UV protection sunglasses', 'weather', 1);
      add('clothing', 'Wide-brim sun hat / Cap', 'weather', 1);
      add('clothing', 'Swimwear / Swim trunks', 'weather', 1);
      add('clothing', 'Comfortable sandals / breathable shoes', 'weather', 1);
      add('toiletries', 'Broad-spectrum Sunscreen (SPF 50+)', 'weather', 1);
      add('toiletries', 'Insect / Mosquito repellent', 'weather', 1);
      add('health', 'Electrolyte hydration packets', 'weather', 4);
      break;

    case 'rainy':
      add('clothing', 'Waterproof rain jacket / Poncho', 'weather', 1);
      add('clothing', 'Waterproof footwear / Quick-dry shoes', 'weather', 1);
      add('clothing', 'Extra pair of quick-dry socks', 'weather', 3);
      add('essentials', 'Compact windproof travel umbrella', 'weather', 1);
      add('essentials', 'Dry bag / Waterproof phone pouch', 'weather', 1);
      break;

    case 'mild':
    default:
      add('clothing', 'Light cardigan or zip-up jacket', 'weather', 1);
      add('clothing', 'Comfortable walking sneakers', 'weather', 1);
      add('clothing', 'Light scarf or windbreaker', 'weather', 1);
      add('toiletries', 'Sunscreen (SPF 30+)', 'weather', 1);
      break;
  }

  // 4. Travel-type specific items
  switch (input.travelType) {
    case 'adventure':
      add('clothing', 'Durable hiking boots & wool socks', 'travel_type', 1);
      add('clothing', 'Quick-dry moisture-wicking shirts', 'travel_type', 3);
      add('essentials', 'LED headlamp with spare batteries', 'travel_type', 1);
      add('essentials', 'Durable reusable water bottle / filter', 'travel_type', 1);
      add('health', 'Outdoor first aid kit (blister pads, antiseptic)', 'travel_type', 1);
      add('essentials', 'Multi-tool or pocket knife (pack in checked bag)', 'travel_type', 1);
      break;

    case 'business':
      add('clothing', 'Business suit / Formal blazer', 'travel_type', 1);
      add('clothing', 'Pressed dress shirts / blouses', 'travel_type', 3);
      add('clothing', 'Dress shoes & matching belt', 'travel_type', 1);
      add('electronics', 'Laptop & power charger', 'travel_type', 1);
      add('electronics', 'HDMI / Display adapter', 'travel_type', 1);
      add('documents', 'Business cards & meeting notes', 'travel_type', 1);
      break;

    case 'family':
      add('health', 'Children pediatric medication & thermometer', 'travel_type', 1);
      add('toiletries', 'Baby/Family wet wipes & sanitizing gel', 'travel_type', 2);
      add('essentials', 'Travel games / Coloring books / Tablets', 'travel_type', 1);
      add('essentials', 'Healthy travel snacks & water bottles', 'travel_type', 3);
      add('essentials', 'Ziploc bags for soiled clothes & snacks', 'travel_type', 5);
      break;

    case 'backpacking':
      add('toiletries', 'Quick-dry microfiber travel towel', 'travel_type', 1);
      add('essentials', 'Luggage combination padlock (for hostel lockers)', 'travel_type', 2);
      add('essentials', 'Compression packing cubes', 'travel_type', 3);
      add('electronics', 'Earplugs & contoured sleep eye mask', 'travel_type', 1);
      add('essentials', 'Compact travel clothesline & clips', 'travel_type', 1);
      break;

    case 'solo':
      add('essentials', 'Discreet money belt / hidden pouch', 'travel_type', 1);
      add('electronics', 'Noise-canceling headphones', 'travel_type', 1);
      add('essentials', 'Journal / notebook & pen', 'travel_type', 1);
      break;

    case 'leisure':
    default:
      add('clothing', 'Casual evening dinner outfits', 'travel_type', 2);
      add('electronics', 'E-reader / Kindle / Travel book', 'travel_type', 1);
      add('toiletries', 'Travel-sized perfume / body spray', 'travel_type', 1);
      break;
  }

  // 5. Destination-specific smart tweaks
  const destLower = input.destination.toLowerCase();
  if (destLower.includes('japan') || destLower.includes('tokyo') || destLower.includes('kyoto')) {
    add('clothing', 'Slip-on shoes (frequent shoe removal in temples/ryokans)', 'destination', 1);
    add('essentials', 'Small coin pouch (cash-heavy transit & vending machines)', 'destination', 1);
    add('essentials', 'Small hand towel (restrooms often have no hand dryers)', 'destination', 1);
  } else if (
    destLower.includes('switzerland') ||
    destLower.includes('alps') ||
    destLower.includes('mountain')
  ) {
    add('clothing', 'UV Glacier sunglasses & lip protection', 'destination', 1);
    add('clothing', 'Windproof breathable mountain shell', 'destination', 1);
  } else if (
    destLower.includes('rome') ||
    destLower.includes('italy') ||
    destLower.includes('vatican')
  ) {
    add('clothing', 'Modest clothing covering shoulders & knees (churches)', 'destination', 1);
    add('clothing', 'Supportive cobblestone walking shoes', 'destination', 1);
  }

  return items;
}
