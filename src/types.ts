export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  imageUrl?: string;
}

export interface CarouselSlide {
  imageUrl: string;
  title?: string;
  caption?: string;
}

export interface AboutItem {
  imageUrl?: string;
  title: string;
  content: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  mapUrl?: string;
}

export interface GalleryItem {
  imageUrl: string;
  title: string;
  description?: string;
  category?: string;
}

export interface FooterData {
  storeName?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}
