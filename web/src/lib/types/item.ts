export interface Item {
  id: string;
  name: string;
  brand: string | null;
  imageUrl?: string;
  wornDates: Date[];
}

