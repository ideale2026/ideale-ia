export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  totalPrice: number;
  totalArea: number;
  strategyName: string | null;
  imageUrl: string | null;
  details: string;
  isInterestOnly?: boolean;
}
