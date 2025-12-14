import { getJSON, postJSON, putJSON } from "./api";

export type Category = { id: number; name: string; parent_id?: number | null; slug: string };
export type Service = {
  id: number;
  provider_id: number;
  category_id: number;
  title: string;
  description: string;
  price: number; // 0 si price_to_agree
  currency: string;
  duration_min: number; // 0 = indefinido
  area_type: string; // PRESENCIAL | REMOTO | PERSONALIZADO | (legacy) CUSTOMER_LOCATION / PROVIDER_LOCATION
  location_note?: string | null;
  price_to_agree: boolean;
  radius_km?: number | null; // opcional, legacy compat
  active: boolean;
  created_at: string;
  // disponibilidad (ISO date strings)
  availability_start_date?: string | null;
  availability_end_date?: string | null;
};

export type ServiceCreate = {
  category_id: number;
  title: string;
  description: string;
  price?: number; // omit if price_to_agree
  currency?: string;
  duration_min?: number; // default 0
  area_type?: string;
  location_note?: string;
  price_to_agree?: boolean;
  radius_km?: number; // opcional para PRESENCIAL (desplazamiento)
  // disponibilidad (YYYY-MM-DD)
  availability_start_date?: string | null;
  availability_end_date?: string | null;
};

export type ServiceImage = { id?: number; service_id?: number; url: string; is_cover?: boolean; sort_order?: number };
export type ServiceSchedule = { id?: number; service_id?: number; weekday: number; time_from: string; time_to: string; timezone?: string };

// Categories
export const listCategories = () => getJSON<Category[]>("/services/categorias");

// Services
export const listServices = (q?: string, categoryId?: number) => {
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (categoryId) params.append("category_id", String(categoryId));
  return getJSON<Service[]>(`/services?${params.toString()}`);
};

export const getService = (id: number) => getJSON<Service>(`/services/${id}`);

// Use trailing slash to avoid 307 redirect from FastAPI when route is defined as "/"
export const createService = (payload: ServiceCreate) => postJSON<Service>("/services/", payload);
export const updateService = (id: number, payload: Partial<ServiceCreate>) => putJSON<Service>(`/services/${id}`, payload);

export const deactivateService = async (id: number) => {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'}/services/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Images
export const setServiceImages = (serviceId: number, images: ServiceImage[]) => postJSON<ServiceImage[]>(`/services/${serviceId}/imagenes`, images);
export const listServiceImages = (serviceId: number) => getJSON<ServiceImage[]>(`/services/${serviceId}/imagenes`);

// Schedule
export const setServiceSchedule = (serviceId: number, slots: ServiceSchedule[]) => postJSON<ServiceSchedule[]>(`/services/${serviceId}/horarios`, slots);
export const listServiceSchedule = (serviceId: number) => getJSON<ServiceSchedule[]>(`/services/${serviceId}/horarios`);

// Bookings
export type Booking = {
  id: number;
  service_id: number;
  customer_id: number;
  provider_id: number;
  status: string; // ej: PENDING, CONFIRMED, CANCELED
  created_at: string;
  updated_at: string;
  service: Service;
};

// Use trailing slash to avoid 307 redirect from FastAPI when route is defined as "/"
export const bookService = (serviceId: number, reservation_datetime?: string) =>
  postJSON<Booking>("/reservations/", { service_id: serviceId, reservation_datetime });

export const listMyBookings = () => getJSON<Booking[]>("/reservations/my-reservations");

// Mine
export const listMyServices = (active?: boolean) => {
  const params = new URLSearchParams();
  if (typeof active === 'boolean') params.append('active', String(active));
  return getJSON<Service[]>(`/services/mios?${params.toString()}`);
};
