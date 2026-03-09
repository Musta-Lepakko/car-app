export type SearchProfile = {
  id: string;
  name: string;
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  yearMin: number;
  mileageMax: number;
  fuel: string;
  transmissionPreference: string;
  preferredBrands: string[];
  acceptableBrands: string[];
  sellerPreference: string;
  prioritizeFloodSuitability: boolean;
  prioritizeCargo: boolean;
  prioritizeEasyParking: boolean;
  includeExceptionCandidates: boolean;
  sourceSelection: string[];
  maxResults: number;
  lastRunAt?: string;
  lastRunStatus?: string;
};

export type ListingItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  price: number;
  year: number;
  mileage: number;
  transmission: string;
  fuel: string;
  city: string;
  sellerType?: string | null;
  photoUrl?: string | null;
  fetchedAt: string;
  score: {
    fitScore: number;
    practicalityScore: number;
    dealScore: number;
    totalScore: number;
    positiveTags: string[];
    cautionTags: string[];
    exceptionReason?: string | null;
  };
  userState: {
    favorite: boolean;
    shortlisted: boolean;
    rejected: boolean;
    notes: string | null;
  };
};

export type ListingsResponse = {
  items: ListingItem[];
  total: number;
};
