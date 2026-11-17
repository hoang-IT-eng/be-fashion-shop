import { DiscountType } from '../vouchers/voucher.entity';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../orders/order.entity';
import { ConciergeStatus } from '../concierge/concierge-request.entity';

/** Shared catalog used by `npm run seed` (idempotent). */

export const SEED_CATEGORIES = [
  {
    name: 'Sneakers',
    imageUrl: '/images/enigma/grail-sneaker-obsidian.jpg',
  },
  {
    name: 'Outerwear',
    imageUrl: '/images/enigma/grail-leather-bomber.jpg',
  },
  {
    name: 'Hoodies',
    imageUrl: '/images/enigma/grail-hoodie-shadow.jpg',
  },
  {
    name: 'Bottoms',
    imageUrl: '/images/enigma/grail-cargo-vanguard.jpg',
  },
  {
    name: 'Relics',
    imageUrl: '/images/enigma/grail-chronograph-relic.jpg',
  },
  {
    name: 'Reborn Archive',
    imageUrl: '/images/enigma/grail-trench-monolith.jpg',
  },
] as const;

export const SEED_USERS = [
  {
    name: 'Enigma Curator (Admin)',
    email: 'admin@fashionshop.com',
    password: 'Admin@123',
    role: 'admin' as const,
  },
  {
    name: 'Kaelen Vinh',
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

export type SeedProduct = {
  name: string;
  brand: string;
  releaseType: 'grail' | 'reborn' | 'archive' | 'drop';
  condition: string;
  authenticityCode: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  sizes: string[];
  colors: string[];
  variants: { size: string; color: string; stock: number }[];
};

function variants(
  sizes: string[],
  colors: string[],
  stockPer = 6,
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
    name: 'ENIGMA 01 "Obsidian Monolith" High-Top',
    brand: 'ENIGMA ATELIER',
    releaseType: 'grail',
    condition: 'Deadstock · Vault Sealed',
    authenticityCode: 'ENG-2026-SNK-001',
    description:
      'Hand-lasted full-grain Italian calfskin high-top resting on an aged warm-bone Vibram cup sole. Individually numbered inner tongue.',
    price: 8900000,
    stock: 18,
    category: 'Sneakers',
    imageUrl: '/images/enigma/grail-sneaker-obsidian.jpg',
    sizes: ['40', '41', '42', '43', '44'],
    colors: ['Obsidian', 'Aged Bone'],
    variants: [
      { size: '40', color: 'Obsidian', stock: 2 },
      { size: '41', color: 'Obsidian', stock: 4 },
      { size: '42', color: 'Obsidian', stock: 5 },
      { size: '43', color: 'Obsidian', stock: 4 },
      { size: '44', color: 'Aged Bone', stock: 3 },
    ],
  },
  {
    name: 'Reborn Horsehide Flight Bomber [1-of-12]',
    brand: 'REBORN BY ENIGMA',
    releaseType: 'reborn',
    condition: 'Reborn 1-of-12 Custom',
    authenticityCode: 'ENG-2026-RBN-002',
    description:
      'Reconstructed from vintage heavyweight Japanese horsehide with oxidized Riri gunmetal hardware and hand-waxed storm seams.',
    price: 14500000,
    stock: 9,
    category: 'Outerwear',
    imageUrl: '/images/enigma/grail-leather-bomber.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Obsidian Patina'],
    variants: [
      { size: 'S', color: 'Obsidian Patina', stock: 1 },
      { size: 'M', color: 'Obsidian Patina', stock: 3 },
      { size: 'L', color: 'Obsidian Patina', stock: 3 },
      { size: 'XL', color: 'Obsidian Patina', stock: 2 },
    ],
  },
  {
    name: 'Shadow Archive 650gsm Sun-Faded Hoodie',
    brand: 'ENIGMA ARCHIVE',
    releaseType: 'drop',
    condition: 'Deadstock',
    authenticityCode: 'ENG-2026-HD-003',
    description:
      'Ultra-dense 650gsm loopwheel French terry enzyme-washed to a smoked charcoal finish with raw-edge drop shoulders and double hood.',
    price: 3450000,
    stock: 32,
    category: 'Hoodies',
    imageUrl: '/images/enigma/grail-hoodie-shadow.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Smoked Charcoal', 'Obsidian'],
    variants: variants(
      ['S', 'M', 'L', 'XL'],
      ['Smoked Charcoal', 'Obsidian'],
      4,
    ),
  },
  {
    name: 'Concrete Vanguard Waxed Cargo Trousers',
    brand: 'VANGUARD LAB',
    releaseType: 'archive',
    condition: 'Archival Mint',
    authenticityCode: 'ENG-2026-BTM-004',
    description:
      '14oz waxed black Okayama selvedge denim engineered with 8 articulated bellows pockets, knee darts, and matte cobra-style clasps.',
    price: 5200000,
    stock: 20,
    category: 'Bottoms',
    imageUrl: '/images/enigma/grail-cargo-vanguard.jpg',
    sizes: ['28', '30', '32', '34'],
    colors: ['Waxed Obsidian'],
    variants: variants(['28', '30', '32', '34'], ['Waxed Obsidian'], 5),
  },
  {
    name: 'Nocturne Skeleton Titanium Chronograph & Signet Set',
    brand: 'ENIGMA HOROLOGY',
    releaseType: 'grail',
    condition: 'Vault Numbered Edition',
    authenticityCode: 'ENG-2026-RLC-005',
    description:
      'Grade-5 brushed black titanium open-worked mechanical calibre with antique gold balance wheel, paired with hammered .925 sterling signet.',
    price: 22800000,
    stock: 5,
    category: 'Relics',
    imageUrl: '/images/enigma/grail-chronograph-relic.jpg',
    sizes: ['One Size'],
    colors: ['Brushed Titanium / Gold'],
    variants: [
      { size: 'One Size', color: 'Brushed Titanium / Gold', stock: 5 },
    ],
  },
  {
    name: 'Aether Bone Suede & Carbon Runner',
    brand: 'VANGUARD LAB',
    releaseType: 'drop',
    condition: 'Deadstock',
    authenticityCode: 'ENG-2026-SNK-006',
    description:
      'Warm bone Italian calf suede upper over ballistic pewter mesh and a sculpted matte-carbon propulsion midsole.',
    price: 6800000,
    stock: 24,
    category: 'Sneakers',
    imageUrl: '/images/enigma/grail-runner-bone.jpg',
    sizes: ['40', '41', '42', '43', '44'],
    colors: ['Warm Bone / Carbon'],
    variants: variants(['40', '41', '42', '43'], ['Warm Bone / Carbon'], 6),
  },
  {
    name: 'Monolith Double-Faced Virgin Wool Overcoat',
    brand: 'ENIGMA ATELIER',
    releaseType: 'reborn',
    condition: 'Atelier Tailored',
    authenticityCode: 'ENG-2026-COT-007',
    description:
      'Floor-sweeping architectural overcoat cut from 780g virgin wool-cashmere with concealed horn placket and razor peak lapels.',
    price: 16900000,
    stock: 11,
    category: 'Reborn Archive',
    imageUrl: '/images/enigma/grail-trench-monolith.jpg',
    sizes: ['S', 'M', 'L'],
    colors: ['Deep Obsidian'],
    variants: [
      { size: 'S', color: 'Deep Obsidian', stock: 3 },
      { size: 'M', color: 'Deep Obsidian', stock: 5 },
      { size: 'L', color: 'Deep Obsidian', stock: 3 },
    ],
  },
  {
    name: 'Archive Heavyweight Boxy Tee — Chiaroscuro Edition',
    brand: 'ENIGMA ARCHIVE',
    releaseType: 'drop',
    condition: 'Deadstock',
    authenticityCode: 'ENG-2026-TEE-008',
    description:
      '340gsm combed organic jersey with tonal blind-stitch crest at nape and structured collar rib.',
    price: 1650000,
    stock: 48,
    category: 'Hoodies',
    imageUrl: '/images/enigma/grail-hoodie-shadow.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Obsidian', 'Warm Bone'],
    variants: variants(['S', 'M', 'L', 'XL'], ['Obsidian', 'Warm Bone'], 6),
  },
  {
    name: 'Selvedge Raw Tapered Denim — 16oz Kuroki Mill',
    brand: 'ENIGMA ARCHIVE',
    releaseType: 'archive',
    condition: 'Unwashed Raw',
    authenticityCode: 'ENG-2026-DNM-009',
    description:
      'Rope-dyed charcoal warp over black weft 16oz Japanese selvedge denim that develops high-contrast silver fades.',
    price: 4100000,
    stock: 24,
    category: 'Bottoms',
    imageUrl: '/images/enigma/grail-cargo-vanguard.jpg',
    sizes: ['28', '30', '32', '34'],
    colors: ['Kuroki Black'],
    variants: variants(['28', '30', '32', '34'], ['Kuroki Black'], 6),
  },
  {
    name: 'Oxidized Sterling Sanctum Chain & Clasp',
    brand: 'ENIGMA HOROLOGY',
    releaseType: 'reborn',
    condition: 'Hand-Forged',
    authenticityCode: 'ENG-2026-RLC-010',
    description:
      'Hand-soldered .925 sterling silver heavy curb link drenched in sulfur patina with engraved monolith box lock.',
    price: 4950000,
    stock: 8,
    category: 'Relics',
    imageUrl: '/images/enigma/grail-chronograph-relic.jpg',
    sizes: ['50cm', '55cm'],
    colors: ['Oxidized Silver'],
    variants: [
      { size: '50cm', color: 'Oxidized Silver', stock: 4 },
      { size: '55cm', color: 'Oxidized Silver', stock: 4 },
    ],
  },
];

export const SEED_REVIEWS = [
  {
    userEmail: 'demo@fashionshop.com',
    productName: 'ENIGMA 01 "Obsidian Monolith" High-Top',
    rating: 5,
    comment:
      'Calfskin grain and aged bone sole Rival Rick & Guidi at half the resale markup. NFC tag verified.',
  },
  {
    userEmail: 'lan@fashionshop.com',
    productName: 'Shadow Archive 650gsm Sun-Faded Hoodie',
    rating: 5,
    comment:
      '650gsm weight drapes like armor. Hood stands structured without collapsing.',
  },
  {
    userEmail: 'demo@fashionshop.com',
    productName: 'Reborn Horsehide Flight Bomber [1-of-12]',
    rating: 5,
    comment:
      'Museum-level horsehide patina. Heavy Riri zips glide effortlessly.',
  },
  {
    userEmail: 'lan@fashionshop.com',
    productName: 'Aether Bone Suede & Carbon Runner',
    rating: 5,
    comment: 'Warm bone suede tone is sublime in person. True to EU sizing.',
  },
] as const;

export const SEED_AUCTIONS = [
  {
    title: 'LOT 01 · Prototype Horsehide Bomber [01/01 Atelier Sample]',
    subtitle: 'Hand-numbered Paris Showroom Sample · Signed Provenance Dossier',
    imageUrl: '/images/enigma/grail-leather-bomber.jpg',
    startingBid: 9500000,
    currentBid: 13200000,
    minIncrement: 250000,
    reservePrice: 12000000,
    hoursFromNow: 6,
    bids: [
      { bidderAlias: 'SHADOW_09', amount: 11800000 },
      { bidderAlias: 'KAELEN_37', amount: 12500000 },
      { bidderAlias: 'VANGUARD_14', amount: 13200000 },
    ],
  },
  {
    title: 'LOT 02 · Nocturne Titanium Tourbillon Study #00',
    subtitle: 'Zero-Series Calibre · Antique Gold Bridge · Basalt Display Case',
    imageUrl: '/images/enigma/grail-chronograph-relic.jpg',
    startingBid: 18000000,
    currentBid: 24500000,
    minIncrement: 500000,
    reservePrice: 24000000,
    hoursFromNow: 2.5,
    bids: [
      { bidderAlias: 'MONOLITH_02', amount: 21000000 },
      { bidderAlias: 'REBORN_77', amount: 23000000 },
      { bidderAlias: 'CHRONO_11', amount: 24500000 },
    ],
  },
  {
    title: 'LOT 03 · Obsidian Monolith High-Top [F&F Aged Sole Pair]',
    subtitle: 'Friends & Family Hand-Distressed Edition · EU 42',
    imageUrl: '/images/enigma/grail-sneaker-obsidian.jpg',
    startingBid: 6500000,
    currentBid: 8400000,
    minIncrement: 200000,
    reservePrice: 9000000,
    hoursFromNow: 0.75,
    bids: [
      { bidderAlias: 'TOKYO_88', amount: 7600000 },
      { bidderAlias: 'ARCHIVE_21', amount: 8400000 },
    ],
  },
] as const;

export const SEED_MYSTERY_BOXES = [
  {
    tierSlug: 'initiate-box',
    name: 'Initiate Box',
    subtitle: 'Essential Entry into the Enigma Archive',
    description:
      '2 authenticated Enigma garments & accessories tailored to your Taste Codex silhouette. Guaranteed minimum retail value 5,200,000₫.',
    price: 3490000,
    guaranteedMinValue: 5200000,
    itemCount: 2,
    imageUrl: '/images/enigma/mystery-chest.jpg',
    archetypeMatch: ['MONOLITH_MINIMALIST', 'SHADOW_ARCHIVE'],
    possibleDrops: [
      { title: '650gsm Sun-Faded Hoodie', rarity: 'Archive Core', odds: '48%' },
      {
        title: 'Chiaroscuro Boxy Tee + Relic Accessory',
        rarity: 'Curated Set',
        odds: '37%',
      },
      {
        title: 'Selvedge Raw Tapered Denim Upgrade',
        rarity: 'Vault Hit',
        odds: '15%',
      },
    ],
  },
  {
    tierSlug: 'inner-circle-chest',
    name: 'Inner Circle Chest',
    subtitle: 'High-Heat Footwear, Waxed Utility & Heavyweight Layers',
    description:
      '3 curated pieces anchored by either a signature Sneaker rotation or Technical Outerwear piece matched to your 8-step Codex.',
    price: 7900000,
    guaranteedMinValue: 11800000,
    itemCount: 3,
    imageUrl: '/images/enigma/mystery-chest.jpg',
    archetypeMatch: ['SHADOW_ARCHIVE', 'CONCRETE_VANGUARD'],
    possibleDrops: [
      {
        title: 'Aether Bone Suede & Carbon Runner',
        rarity: 'High Heat',
        odds: '42%',
      },
      {
        title: 'Concrete Vanguard Waxed Cargo + Hoodie',
        rarity: 'Vanguard Pack',
        odds: '40%',
      },
      {
        title: 'Obsidian Monolith High-Top Grail',
        rarity: 'Grail Pull',
        odds: '18%',
      },
    ],
  },
  {
    tierSlug: 'grail-vault',
    name: 'Grail Vault',
    subtitle: 'Numbered Reborn Customs, Titanium Horology & 1-of-1 Relics',
    description:
      'Sealed anodized aluminum vault chest containing 3–4 flagship collector pieces, including guaranteed Reborn Atelier or Grail-tier allocation.',
    price: 15900000,
    guaranteedMinValue: 24500000,
    itemCount: 4,
    imageUrl: '/images/enigma/mystery-chest.jpg',
    archetypeMatch: ['NEO_RENAISSANCE', 'SHADOW_ARCHIVE'],
    possibleDrops: [
      {
        title: 'Reborn Horsehide Flight Bomber [1-of-12]',
        rarity: '1-of-12 Custom',
        odds: '38%',
      },
      {
        title: 'Monolith Virgin Wool Overcoat + Sterling Chain',
        rarity: 'Atelier Couture',
        odds: '42%',
      },
      {
        title: 'Nocturne Skeleton Titanium Chronograph Set',
        rarity: 'Mythic Grail',
        odds: '20%',
      },
    ],
  },
];

export const SEED_VOUCHERS = [
  {
    code: 'ENIGMA15',
    description: 'Inner Circle Initiation — 15% Privilege (Max 2,500,000₫)',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 15,
    minOrderAmount: 0,
    maxDiscountAmount: 2500000,
    usageLimit: 9999,
    isSecretInitiation: true,
  },
  {
    code: 'CULT10',
    description: 'First Drop Welcome — 10% Off Orders Above 2,000,000₫',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderAmount: 2000000,
    maxDiscountAmount: 1500000,
    usageLimit: 500,
    isSecretInitiation: false,
  },
  {
    code: 'VAULT500K',
    description: '500,000₫ Direct Vault Credit on Grail Orders >= 6,000,000₫',
    discountType: DiscountType.FIXED,
    discountValue: 500000,
    minOrderAmount: 6000000,
    maxDiscountAmount: 500000,
    usageLimit: 250,
    isSecretInitiation: false,
  },
] as const;

export const SEED_CONCIERGE = [
  {
    requesterName: 'Kaelen Vinh',
    requesterEmail: 'demo@fashionshop.com',
    itemName: 'Rick Owens Geobasket Ponyhair Archive 2014',
    brand: 'Rick Owens',
    size: 'EU 42',
    targetPrice: 16500000,
    notes: 'Prefer original box and tonal laces. Clean creasing acceptable.',
    status: ConciergeStatus.REVIEWING,
  },
  {
    requesterName: 'Lan Nguyen',
    requesterEmail: 'lan@fashionshop.com',
    itemName: 'Maison Margiela Artisanal Tabi Boot Paint Splatter',
    brand: 'Maison Margiela',
    size: 'EU 38',
    targetPrice: 18200000,
    notes: 'Matte charcoal or white over-paint over black leather.',
    status: ConciergeStatus.COUNTERED,
    counterOfferPrice: 19500000,
    adminNotes:
      'Located Deadstock pair in Tokyo partner vault; includes wooden shoe trees.',
  },
] as const;

export const SEED_SAMPLE_ORDERS = [
  {
    userEmail: 'demo@fashionshop.com',
    productName: 'ENIGMA 01 "Obsidian Monolith" High-Top',
    size: '42',
    color: 'Obsidian',
    quantity: 1,
    shippingName: 'Kaelen Vinh',
    shippingPhone: '0909123456',
    shippingAddress: '88 Đồng Khởi, Quận 1, TP. Hồ Chí Minh',
    paymentMethod: PaymentMethod.VNPAY,
    paymentStatus: PaymentStatus.PAID,
    status: OrderStatus.DELIVERED,
  },
  {
    userEmail: 'lan@fashionshop.com',
    productName: 'Shadow Archive 650gsm Sun-Faded Hoodie',
    size: 'M',
    color: 'Smoked Charcoal',
    quantity: 1,
    shippingName: 'Lan Nguyen',
    shippingPhone: '0912345678',
    shippingAddress: '24 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.UNPAID,
    status: OrderStatus.SHIPPING,
  },
] as const;
