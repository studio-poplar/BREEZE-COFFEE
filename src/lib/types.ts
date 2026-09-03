export type StoreType = "permanent" | "popup";

export interface Store {
  store_id: string;
  name: string;
  type: StoreType;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
}

export interface OptionChoice {
  choice_id: string;
  group_id: string;
  label: string;
  extra_price: number;
  sort_order: number;
}

export interface OptionGroup {
  group_id: string;
  item_id: string;
  label: string;
  required: boolean;
  multi_select: boolean;
  sort_order: number;
  choices: OptionChoice[];
}

export interface MenuItem {
  item_id: string;
  store_id: string;
  name: string;
  price: number;
  cost_price: number;
  category: string;
  image_path: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  option_groups: OptionGroup[];
}

/** A single selected option, snapshotted onto an order item / favorite. */
export interface SelectedOption {
  group_label: string;
  choice_label: string;
  extra_price: number;
}

export type OrderStatus = "unpaid" | "paid" | "served";
export type PaymentMethod = "cash" | "card" | "emoney" | "qr";

export interface OrderItem {
  order_item_id: string;
  order_id: string;
  item_id: string;
  item_name_snapshot: string;
  unit_price: number;
  qty: number;
  selected_options: SelectedOption[];
}

export interface Order {
  order_id: string;
  order_token: string;
  store_id: string;
  customer_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total_price: number;
  created_at: string;
  paid_at: string | null;
  served_at: string | null;
  items: OrderItem[];
}

export interface Customer {
  customer_id: string;
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  created_at: string;
}

export interface Favorite {
  favorite_id: string;
  customer_id: string;
  item_id: string | null;
  item_name: string;
  label: string;
  selected_options: SelectedOption[];
  created_at: string;
}

/** A favorite resolved against one store's current menu, ready to reorder. */
export interface ResolvedFavorite extends Favorite {
  current_item: MenuItem | null;
}

export interface MenuItemInput {
  name: string;
  price: number;
  cost_price?: number;
  category: string;
  image_path?: string | null;
  active?: boolean;
  sort_order?: number;
  option_groups: {
    label: string;
    required: boolean;
    multi_select: boolean;
    choices: { label: string; extra_price: number }[];
  }[];
}

export type StaffRole = "admin" | "register";

export interface Staff {
  staff_id: string;
  username: string;
  display_name: string;
  role: StaffRole;
  store_ids: string[];
}

/** Cart line kept client-side only, before an order is created server-side. */
export interface CartLine {
  item_id: string;
  item_name: string;
  unit_price: number;
  qty: number;
  selected_options: SelectedOption[];
}
