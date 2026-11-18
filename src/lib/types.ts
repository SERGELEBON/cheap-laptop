/* Cheap Laptops Ghana — shared types */
export interface Cat {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  banner: string | null;
  yoastTitle: string;
  yoastDesc: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  count: number;
  logo: string | null;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  sku: string;
  price: number;
  regular: number | null;
  priceFmt: string;
  regularFmt: string | null;
  onSale: boolean;
  discount: number;
  image: string | null;
  gallery: string[];
  categories: { id: number; name: string; slug: string }[];
  brand: { id: number; name: string; slug: string } | null;
  shortDescription: string;
  description: string;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  content: string;
}

export interface Catalog {
  generatedAt: string;
  products: Product[];
  categories: Cat[];
  categoriesBySlug: Record<string, Cat>;
  productsBySlug: Record<string, Product>;
  brands: Brand[];
  brandsBySlug: Record<string, Brand>;
  pages: Page[];
  pagesBySlug: Record<string, Page>;
  homeSections: { title: string; slug: string; products: string[] }[];
}

export interface CartLine {
  id: number;
  slug: string;
  name: string;
  price: number;
  priceFmt: string;
  image: string | null;
  qty: number;
  stock: boolean;
}

export type View =
  | { name: "home" }
  | { name: "category"; slug: string }
  | { name: "product"; slug: string }
  | { name: "brand"; slug: string }
  | { name: "shop"; sale?: boolean }
  | { name: "search"; q: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "order-success"; orderId: string }
  | { name: "wishlist" }
  | { name: "account" }
  | { name: "admin" }
  | { name: "page"; slug: string };

/* Mega menu structure — Cheap Laptops Ghana */
export interface MenuItem {
  label: string;
  type: "cat" | "brand" | "shop" | "page" | "sale";
  slug: string;
  children?: MenuItem[];
}

export const MAIN_MENU: { label: string; items: MenuItem[] }[] = [
  {
    label: "Laptops",
    items: [
      {
        label: "Gaming Laptops", type: "cat", slug: "laptops/gaming-laptops",
        children: [
          { label: "HP Gaming", type: "brand", slug: "hp" },
          { label: "Lenovo Legion & LOQ", type: "brand", slug: "lenovo" },
          { label: "MSI", type: "brand", slug: "msi" },
          { label: "ASUS ROG & TUF", type: "brand", slug: "asus" },
        ],
      },
      {
        label: "Business Laptops", type: "cat", slug: "laptops/business-laptops",
        children: [
          { label: "HP ProBook & EliteBook", type: "brand", slug: "hp" },
          { label: "Dell Latitude & Vostro", type: "brand", slug: "dell" },
          { label: "Lenovo ThinkPad", type: "brand", slug: "lenovo" },
          { label: "Acer TravelMate", type: "brand", slug: "acer" },
        ],
      },
      {
        label: "Student Laptops", type: "cat", slug: "laptops/student-laptops",
        children: [
          { label: "Under GH₵ 4,000", type: "cat", slug: "laptops/student-laptops" },
          { label: "Chromebooks", type: "cat", slug: "laptops/chromebooks" },
        ],
      },
      {
        label: "Shop All Laptops", type: "cat", slug: "laptops",
        children: [
          { label: "Ultrabooks", type: "cat", slug: "laptops/ultrabooks" },
          { label: "2-in-1 & Detachable", type: "cat", slug: "laptops/2-in-1-detachable" },
        ],
      },
    ],
  },
  {
    label: "MacBooks",
    items: [
      {
        label: "MacBook Air", type: "cat", slug: "macbooks/macbook-air",
        children: [
          { label: "Apple", type: "brand", slug: "apple" },
          { label: "MacBook Air M1", type: "cat", slug: "macbooks/macbook-air" },
          { label: "MacBook Air M2", type: "cat", slug: "macbooks/macbook-air" },
          { label: "MacBook Air M3", type: "cat", slug: "macbooks/macbook-air" },
        ],
      },
      {
        label: "MacBook Pro", type: "cat", slug: "macbooks/macbook-pro",
        children: [
          { label: "MacBook Pro 14\"", type: "cat", slug: "macbooks/macbook-pro" },
          { label: "MacBook Pro 16\"", type: "cat", slug: "macbooks/macbook-pro" },
        ],
      },
    ],
  },
  {
    label: "Computers",
    items: [
      {
        label: "Desktops", type: "cat", slug: "computers/desktops",
        children: [
          { label: "HP Desktops", type: "brand", slug: "hp" },
          { label: "Dell OptiPlex", type: "brand", slug: "dell" },
          { label: "Lenovo ThinkCentre", type: "brand", slug: "lenovo" },
        ],
      },
      {
        label: "Monitors", type: "cat", slug: "computers/monitors",
        children: [
          { label: "HP", type: "brand", slug: "hp" },
          { label: "Dell", type: "brand", slug: "dell" },
          { label: "LG", type: "brand", slug: "lg" },
          { label: "Samsung", type: "brand", slug: "samsung" },
        ],
      },
    ],
  },
  {
    label: "Accessories",
    items: [
      {
        label: "Laptop Bags", type: "cat", slug: "accessories/bags",
        children: [{ label: "Backpacks", type: "cat", slug: "accessories/bags" }],
      },
      {
        label: "Mice", type: "cat", slug: "accessories/mice",
        children: [
          { label: "Logitech", type: "brand", slug: "logitech" },
          { label: "Oraimo", type: "brand", slug: "oraimo" },
          { label: "HP", type: "brand", slug: "hp" },
        ],
      },
      {
        label: "Headsets", type: "cat", slug: "accessories/headsets",
        children: [
          { label: "Oraimo", type: "brand", slug: "oraimo" },
          { label: "HP", type: "brand", slug: "hp" },
          { label: "Logitech", type: "brand", slug: "logitech" },
        ],
      },
    ],
  },
  {
    label: "Electric Bikes & Scooters",
    items: [
      {
        label: "Electric Scooters", type: "cat", slug: "scooters/electric-scooters",
        children: [
          { label: "GH₵ 7,000 — City Rider", type: "cat", slug: "scooters/electric-scooters" },
          { label: "GH₵ 10,000 — Cruiser", type: "cat", slug: "scooters/electric-scooters" },
          { label: "GH₵ 12,000 — Luxury Max", type: "cat", slug: "scooters/electric-scooters" },
          { label: "Visit Accra Store", type: "page", slug: "locations" },
        ],
      },
    ],
  },
  {
    label: "Brands",
    items: [
      {
        label: "Shop By Brands", type: "shop", slug: "brands",
        children: [
          { label: "HP", type: "brand", slug: "hp" },
          { label: "Dell", type: "brand", slug: "dell" },
          { label: "Lenovo", type: "brand", slug: "lenovo" },
          { label: "Apple", type: "brand", slug: "apple" },
        ],
      },
      {
        label: "Shop By Brands", type: "shop", slug: "brands",
        children: [
          { label: "Microsoft", type: "brand", slug: "microsoft" },
          { label: "ASUS", type: "brand", slug: "asus" },
          { label: "Acer", type: "brand", slug: "acer" },
          { label: "MSI", type: "brand", slug: "msi" },
        ],
      },
      {
        label: "Shop By Brands", type: "shop", slug: "brands",
        children: [
          { label: "LG", type: "brand", slug: "lg" },
          { label: "Samsung", type: "brand", slug: "samsung" },
          { label: "Oraimo", type: "brand", slug: "oraimo" },
          { label: "Logitech", type: "brand", slug: "logitech" },
        ],
      },
    ],
  },
];

/* Hero slides — Cheap Laptops Ghana (img = tuile carrée, banner = bannière large 2880x960 pour le slider) */
export const HERO_SLIDES: { label: string; img: string; banner: string; cat: string }[] = [
  { label: "Now Open!", img: "/images/cl/hero-open.png", banner: "/images/cl/banner-open.jpg", cat: "laptops" },
  { label: "Gaming Laptops", img: "/images/cl/hero-gaming.png", banner: "/images/cl/banner-gaming.jpg", cat: "laptops/gaming-laptops" },
  { label: "Ultrabooks", img: "/images/cl/hero-ultrabook.png", banner: "/images/cl/banner-ultrabook.jpg", cat: "laptops/ultrabooks" },
  { label: "MacBooks", img: "/images/cl/hero-macbook.png", banner: "/images/cl/banner-macbook.jpg", cat: "macbooks" },
  { label: "Student Laptops", img: "/images/cl/hero-student.png", banner: "/images/cl/banner-student.jpg", cat: "laptops/student-laptops" },
  { label: "2-in-1 & Detachable", img: "/images/cl/hero-2in1.png", banner: "/images/cl/banner-2in1.jpg", cat: "laptops/2-in-1-detachable" },
  { label: "Accessories", img: "/images/cl/hero-accessories.png", banner: "/images/cl/banner-accessories.jpg", cat: "accessories" },
  { label: "Electric Scooters", img: "/images/cl/hero-scooter.png", banner: "/images/cl/banner-scooter.jpg", cat: "scooters" },
  { label: "Desktops", img: "/images/cl/hero-desktop.png", banner: "/images/cl/banner-desktop.jpg", cat: "computers/desktops" },
  { label: "Monitors", img: "/images/cl/hero-monitor.png", banner: "/images/cl/banner-monitor.jpg", cat: "computers/monitors" },
];
