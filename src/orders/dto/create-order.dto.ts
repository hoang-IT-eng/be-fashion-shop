export class CartItemDto {
  id: number;
  name: string;
  price: number;
  quantity: number;

  constructor(id: number, name: string, price: number, quantity: number) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.quantity = quantity;
  }
}

export class CreateOrderDto {
  cart: CartItemDto[] = []; // Khởi tạo giá trị mặc định
  total: number = 0; // Khởi tạo giá trị mặc định
  paymentMethod: string = ''; // Khởi tạo giá trị mặc định
}