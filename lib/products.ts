import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReminderUnit = 'days' | 'hours';

export interface Product {
  id: string;
  name: string;
  quantity: string;
  category: string;
  expiryAt: string;
  reminderValue: number;
  reminderUnit: ReminderUnit;
  barcode?: string;
  notificationId?: string;
  createdAt: string;
}

const STORAGE_KEY = '@freshdate_products';

export async function getProducts(): Promise<Product[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveProducts(products: Product[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export async function addProduct(
  product: Omit<Product, 'id' | 'createdAt'>
): Promise<Product> {
  const products = await getProducts();
  const newProduct: Product = {
    ...product,
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
  };
  products.push(newProduct);
  await saveProducts(products);
  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return;
  products[index] = { ...products[index], ...updates };
  await saveProducts(products);
}

export async function deleteProduct(id: string): Promise<void> {
  const products = await getProducts();
  await saveProducts(products.filter((p) => p.id !== id));
}

export type ProductStatus = 'expired' | 'expiring' | 'ok';

export function getProductStatus(expiryAt: string): ProductStatus {
  const now = new Date();
  const expiry = new Date(expiryAt);
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return 'expired';
  if (diffHours <= 48) return 'expiring';
  return 'ok';
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}