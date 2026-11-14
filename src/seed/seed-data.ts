/** Shared catalog used by `npm run seed` (idempotent). */

export const SEED_CATEGORIES = [
  {
    name: 'Áo thun',
    imageUrl:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  },
  {
    name: 'Áo sơ mi',
    imageUrl:
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
  },
  {
    name: 'Quần jean',
    imageUrl:
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
  },
  {
    name: 'Váy đầm',
    imageUrl:
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
  },
  {
    name: 'Áo khoác',
    imageUrl:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
  },
  {
    name: 'Phụ kiện',
    imageUrl:
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80',
  },
] as const;

export const SEED_USERS = [
  {
    name: 'Admin',
    email: 'admin@fashionshop.com',
    password: 'Admin@123',
    role: 'admin' as const,
  },
  {
    name: 'Demo User',
    email: 'demo@fashionshop.com',
    password: 'Demo@123',
    role: 'user' as const,
  },
  {
    name: 'Lan Nguyen',
    email: 'lan@fashionshop.com',
    password: 'Demo@123',
    role: 'user' as const,
  },
] as const;

type SeedProduct = {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  sizes: string[];
  colors: string[];
  variants: { size: string; color: string; stock: number }[];
};

const S = ['S', 'M', 'L', 'XL'];
const colorsA = ['Đen', 'Trắng', 'Be'];
const colorsB = ['Xanh navy', 'Xám', 'Nâu'];

function variants(
  sizes: string[],
  colors: string[],
  stockPer = 15,
): SeedProduct['variants'] {
  const out: SeedProduct['variants'] = [];
  for (const size of sizes) {
    for (const color of colors) {
      out.push({ size, color, stock: stockPer });
    }
  }
  return out;
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Áo thun TheBasic Essential',
    description: 'Cotton 100%, form regular, logo thêu tối giản.',
    price: 249000,
    stock: 120,
    category: 'Áo thun',
    imageUrl:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    sizes: S,
    colors: colorsA,
    variants: variants(S, colorsA),
  },
  {
    name: 'Áo thun Oversized Wash',
    description: 'Wash mềm, drop shoulder, phù hợp streetwear.',
    price: 299000,
    stock: 90,
    category: 'Áo thun',
    imageUrl:
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
    sizes: S,
    colors: ['Đen', 'Xám', 'Olive'],
    variants: variants(S, ['Đen', 'Xám', 'Olive']),
  },
  {
    name: 'Áo thun Polo Pique',
    description: 'Cổ polo, vải pique thoáng khí.',
    price: 329000,
    stock: 80,
    category: 'Áo thun',
    imageUrl:
      'https://images.unsplash.com/photo-1625910513513-918d3017c47a?w=800&q=80',
    sizes: S,
    colors: colorsB,
    variants: variants(S, colorsB),
  },
  {
    name: 'Áo thun Crop Rib',
    description: 'Form crop nữ, gân rib ôm nhẹ.',
    price: 219000,
    stock: 70,
    category: 'Áo thun',
    imageUrl:
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80',
    sizes: ['S', 'M', 'L'],
    colors: ['Trắng', 'Hồng', 'Đen'],
    variants: variants(['S', 'M', 'L'], ['Trắng', 'Hồng', 'Đen']),
  },
  {
    name: 'Sơ mi Oxford Classic',
    description: 'Oxford cotton, cổ button-down, dễ phối.',
    price: 449000,
    stock: 60,
    category: 'Áo sơ mi',
    imageUrl:
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
    sizes: S,
    colors: ['Trắng', 'Xanh nhạt', 'Hồng nhạt'],
    variants: variants(S, ['Trắng', 'Xanh nhạt', 'Hồng nhạt']),
  },
  {
    name: 'Sơ mi Linen Summer',
    description: 'Linen thoáng, form suông mùa hè.',
    price: 499000,
    stock: 55,
    category: 'Áo sơ mi',
    imageUrl:
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
    sizes: S,
    colors: ['Be', 'Trắng', 'Xanh mint'],
    variants: variants(S, ['Be', 'Trắng', 'Xanh mint']),
  },
  {
    name: 'Sơ mi Slim Stretch',
    description: 'Vải co giãn nhẹ, form slim office.',
    price: 479000,
    stock: 50,
    category: 'Áo sơ mi',
    imageUrl:
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
    sizes: S,
    colors: colorsB,
    variants: variants(S, colorsB),
  },
  {
    name: 'Sơ mi Flannel Check',
    description: 'Flannel kẻ caro, cảm giác ấm nhẹ.',
    price: 429000,
    stock: 45,
    category: 'Áo sơ mi',
    imageUrl:
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80',
    sizes: S,
    colors: ['Đỏ caro', 'Xanh caro'],
    variants: variants(S, ['Đỏ caro', 'Xanh caro']),
  },
  {
    name: 'Jean Slim Indigo',
    description: 'Denim indigo stretch, slim fit.',
    price: 599000,
    stock: 70,
    category: 'Quần jean',
    imageUrl:
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
    sizes: ['28', '30', '32', '34'],
    colors: ['Indigo', 'Đen'],
    variants: variants(['28', '30', '32', '34'], ['Indigo', 'Đen'], 12),
  },
  {
    name: 'Jean Wide Clean',
    description: 'Ống rộng, wash sạch, mid-rise.',
    price: 649000,
    stock: 55,
    category: 'Quần jean',
    imageUrl:
      'https://images.unsplash.com/photo-1475178626620-a4d074967337?w=800&q=80',
    sizes: ['28', '30', '32', '34'],
    colors: ['Xanh nhạt', 'Xám'],
    variants: variants(['28', '30', '32', '34'], ['Xanh nhạt', 'Xám'], 10),
  },
  {
    name: 'Jean Straight Raw',
    description: 'Straight raw denim, ít wash.',
    price: 679000,
    stock: 40,
    category: 'Quần jean',
    imageUrl:
      'https://images.unsplash.com/photo-1604176354204-926873782855?w=800&q=80',
    sizes: ['28', '30', '32', '34'],
    colors: ['Raw blue'],
    variants: variants(['28', '30', '32', '34'], ['Raw blue'], 10),
  },
  {
    name: 'Jean Mom Vintage',
    description: 'Mom jean vintage wash cho nữ.',
    price: 589000,
    stock: 48,
    category: 'Quần jean',
    imageUrl:
      'https://images.unsplash.com/photo-1582418702059-97ebaf0f5c0a?w=800&q=80',
    sizes: ['26', '28', '30', '32'],
    colors: ['Wash sáng', 'Wash đậm'],
    variants: variants(['26', '28', '30', '32'], ['Wash sáng', 'Wash đậm'], 10),
  },
  {
    name: 'Đầm Midi Linen',
    description: 'Đầm midi linen, dây buộc eo.',
    price: 729000,
    stock: 35,
    category: 'Váy đầm',
    imageUrl:
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
    sizes: ['S', 'M', 'L'],
    colors: ['Be', 'Olive', 'Đen'],
    variants: variants(['S', 'M', 'L'], ['Be', 'Olive', 'Đen'], 8),
  },
  {
    name: 'Đầm Sơ mi Cotton',
    description: 'Shirt dress cotton, nút trước.',
    price: 699000,
    stock: 40,
    category: 'Váy đầm',
    imageUrl:
      'https://images.unsplash.com/photo-1572804013309-59a88b7e8801?w=800&q=80',
    sizes: ['S', 'M', 'L'],
    colors: ['Trắng', 'Xanh nhạt'],
    variants: variants(['S', 'M', 'L'], ['Trắng', 'Xanh nhạt'], 10),
  },
  {
    name: 'Váy Tennis Pleat',
    description: 'Váy tennis xếp ly, lưng thun.',
    price: 399000,
    stock: 50,
    category: 'Váy đầm',
    imageUrl:
      'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80',
    sizes: ['S', 'M', 'L'],
    colors: ['Trắng', 'Đen', 'Navy'],
    variants: variants(['S', 'M', 'L'], ['Trắng', 'Đen', 'Navy'], 10),
  },
  {
    name: 'Đầm Maxi Floral',
    description: 'Maxi họa tiết hoa, vải voan nhẹ.',
    price: 789000,
    stock: 30,
    category: 'Váy đầm',
    imageUrl:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
    sizes: ['S', 'M', 'L'],
    colors: ['Hoa đỏ', 'Hoa xanh'],
    variants: variants(['S', 'M', 'L'], ['Hoa đỏ', 'Hoa xanh'], 8),
  },
  {
    name: 'Áo khoác Bomber Nylon',
    description: 'Bomber nylon nhẹ, túi zip.',
    price: 849000,
    stock: 40,
    category: 'Áo khoác',
    imageUrl:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
    sizes: S,
    colors: ['Đen', 'Olive', 'Navy'],
    variants: variants(S, ['Đen', 'Olive', 'Navy'], 8),
  },
  {
    name: 'Áo khoác Denim Trucker',
    description: 'Trucker denim classic.',
    price: 899000,
    stock: 35,
    category: 'Áo khoác',
    imageUrl:
      'https://images.unsplash.com/photo-1576995853123-5a967fd0e9f3?w=800&q=80',
    sizes: S,
    colors: ['Indigo', 'Đen'],
    variants: variants(S, ['Indigo', 'Đen'], 8),
  },
  {
    name: 'Áo khoác Blazer Soft',
    description: 'Blazer mềm, 1 nút, dễ mặc công sở.',
    price: 999000,
    stock: 28,
    category: 'Áo khoác',
    imageUrl:
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
    sizes: S,
    colors: ['Be', 'Đen', 'Xám'],
    variants: variants(S, ['Be', 'Đen', 'Xám'], 6),
  },
  {
    name: 'Áo khoác Windbreaker',
    description: 'Windbreaker packable, chống gió nhẹ.',
    price: 759000,
    stock: 42,
    category: 'Áo khoác',
    imageUrl:
      'https://images.unsplash.com/photo-1544923246-77307dd254cb?w=800&q=80',
    sizes: S,
    colors: ['Đen', 'Xanh dương'],
    variants: variants(S, ['Đen', 'Xanh dương'], 8),
  },
  {
    name: 'Túi Tote Canvas TheBasic',
    description: 'Tote canvas in logo TheBasic.',
    price: 279000,
    stock: 100,
    category: 'Phụ kiện',
    imageUrl:
      'https://images.unsplash.com/photo-1590874103328-eac38a67478a?w=800&q=80',
    sizes: ['One size'],
    colors: ['Be', 'Đen'],
    variants: variants(['One size'], ['Be', 'Đen'], 40),
  },
  {
    name: 'Mũ Bucket Cotton',
    description: 'Bucket hat cotton wash.',
    price: 189000,
    stock: 80,
    category: 'Phụ kiện',
    imageUrl:
      'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&q=80',
    sizes: ['One size'],
    colors: ['Be', 'Đen', 'Olive'],
    variants: variants(['One size'], ['Be', 'Đen', 'Olive'], 25),
  },
  {
    name: 'Thắt lưng Leather Slim',
    description: 'Thắt lưng da slim, khóa kim loại.',
    price: 349000,
    stock: 60,
    category: 'Phụ kiện',
    imageUrl:
      'https://images.unsplash.com/photo-1624222247344-550fb60583fd?w=800&q=80',
    sizes: ['85', '90', '95', '100'],
    colors: ['Nâu', 'Đen'],
    variants: variants(['85', '90', '95', '100'], ['Nâu', 'Đen'], 10),
  },
  {
    name: 'Khăn Linen Soft',
    description: 'Khăn linen mềm, màu trung tính.',
    price: 229000,
    stock: 70,
    category: 'Phụ kiện',
    imageUrl:
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80',
    sizes: ['One size'],
    colors: ['Be', 'Xám', 'Olive'],
    variants: variants(['One size'], ['Be', 'Xám', 'Olive'], 20),
  },
  {
    name: 'Áo thun Graphic Line',
    description: 'Graphic line art tối giản mặt trước.',
    price: 269000,
    stock: 85,
    category: 'Áo thun',
    imageUrl:
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
    sizes: S,
    colors: ['Trắng', 'Đen'],
    variants: variants(S, ['Trắng', 'Đen']),
  },
  {
    name: 'Quần jean Cargo Hybrid',
    description: 'Jean cargo túi hộp, form relaxed.',
    price: 719000,
    stock: 38,
    category: 'Quần jean',
    imageUrl:
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80',
    sizes: ['28', '30', '32', '34'],
    colors: ['Xám đậm', 'Olive'],
    variants: variants(['28', '30', '32', '34'], ['Xám đậm', 'Olive'], 8),
  },
];

export const SEED_REVIEWS = [
  {
    userEmail: 'demo@fashionshop.com',
    productName: 'Áo thun TheBasic Essential',
    rating: 5,
    comment: 'Vải mềm, form đẹp, sẽ mua lại.',
  },
  {
    userEmail: 'lan@fashionshop.com',
    productName: 'Áo thun TheBasic Essential',
    rating: 4,
    comment: 'Màu be rất dễ phối.',
  },
  {
    userEmail: 'demo@fashionshop.com',
    productName: 'Jean Slim Indigo',
    rating: 5,
    comment: 'Ôm vừa, không bó quá.',
  },
  {
    userEmail: 'lan@fashionshop.com',
    productName: 'Đầm Midi Linen',
    rating: 5,
    comment: 'Mặc mát, lên form sang.',
  },
  {
    userEmail: 'demo@fashionshop.com',
    productName: 'Áo khoác Bomber Nylon',
    rating: 4,
    comment: 'Nhẹ và ấm vừa phải.',
  },
  {
    userEmail: 'lan@fashionshop.com',
    productName: 'Túi Tote Canvas TheBasic',
    rating: 5,
    comment: 'Chắc chắn, đựng laptop 13" ổn.',
  },
] as const;
