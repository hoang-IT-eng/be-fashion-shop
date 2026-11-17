import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MysteryBox } from './mystery-box.entity';
import { StyleProfile } from '../ai-chat/entities/style-profile.entity';
import {
  CreateMysteryBoxDto,
  DecodeStyleQuizDto,
  UpdateMysteryBoxDto,
} from './dto/mystery-box.dto';

export type ArchetypeKey =
  | 'SHADOW_ARCHIVE'
  | 'CONCRETE_VANGUARD'
  | 'NEO_RENAISSANCE'
  | 'MONOLITH_MINIMALIST';

export interface TasteCodexMetadata {
  code: ArchetypeKey;
  archetype: string;
  motto: string;
  description: string;
  paletteNotes: string[];
  categories: string[];
  keywords: string[];
  defaultTierSlug: string;
}

export const TASTE_CODEX_CATALOG: Record<ArchetypeKey, TasteCodexMetadata> = {
  SHADOW_ARCHIVE: {
    code: 'SHADOW_ARCHIVE',
    archetype: 'Shadow Archive',
    motto: 'Distressed lineage, sun-faded blacks, and archival provenance.',
    description:
      'Drawn to heavy 650gsm jersey, horsehide patina, and underground Tokyo-Paris archive silhouettes where wear tells the provenance.',
    paletteNotes: ['Obsidian', 'Charcoal', 'Washed Pewter'],
    categories: ['Outerwear', 'Hoodies', 'Sneakers'],
    keywords: ['archive', 'distressed', 'heavyweight', 'leather', 'black'],
    defaultTierSlug: 'inner-circle-chest',
  },
  CONCRETE_VANGUARD: {
    code: 'CONCRETE_VANGUARD',
    archetype: 'Concrete Vanguard',
    motto: 'Engineered utility forged for nocturnal metropolis transit.',
    description:
      'Prioritizes articulated cargo geometry, waxed selvedge textiles, gunmetal hardware, and sculptural technical runners.',
    paletteNotes: ['Smoked Slate', 'Gunmetal', 'Raw Indigo'],
    categories: ['Bottoms', 'Outerwear', 'Sneakers'],
    keywords: ['cargo', 'technical', 'waxed', 'runner', 'utility'],
    defaultTierSlug: 'inner-circle-chest',
  },
  NEO_RENAISSANCE: {
    code: 'NEO_RENAISSANCE',
    archetype: 'Neo-Renaissance',
    motto: 'Chiaroscuro drama, artisanal relics, and 1-of-1 Reborn couture.',
    description:
      'Collects hand-reconstructed Reborn customs, oxidized sterling relics, skeleton horology, and museum-grade statement grails.',
    paletteNotes: ['Warm Bone', 'Antique Gold', 'Deep Obsidian'],
    categories: ['Relics', 'Outerwear', 'Sneakers'],
    keywords: ['reborn', 'custom', 'chronograph', 'artisan', 'grail'],
    defaultTierSlug: 'grail-vault',
  },
  MONOLITH_MINIMALIST: {
    code: 'MONOLITH_MINIMALIST',
    archetype: 'Monolith Minimalist',
    motto: 'Architectural silence. Zero ornament, absolute proportion.',
    description:
      'Commands rooms through razor-cut wool-cashmere coats, unbranded calfskin footwear, and disciplined tonal layering.',
    paletteNotes: ['Obsidian', 'Warm Bone', 'Taupe'],
    categories: ['Outerwear', 'Tops', 'Accessories'],
    keywords: ['minimal', 'monolith', 'coat', 'tailored', 'clean'],
    defaultTierSlug: 'initiate-box',
  },
};

export const QUIZ_STEPS = [
  {
    step: 1,
    field: 'silhouette',
    question: 'Select your dominant silhouette proportion',
    options: [
      {
        value: 'oversized_drape',
        label: 'Oversized Architectural Drape',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'articulated_tech',
        label: 'Articulated Tactical Fit',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'bespoke_sculpted',
        label: 'Sculpted Atelier Cut',
        archetype: 'NEO_RENAISSANCE',
      },
      {
        value: 'razor_tailored',
        label: 'Clean Monolithic Column',
        archetype: 'MONOLITH_MINIMALIST',
      },
    ],
  },
  {
    step: 2,
    field: 'palette',
    question: 'Choose your nocturnal chromatic register',
    options: [
      {
        value: 'obsidian_ash',
        label: 'Obsidian & Sun-Faded Ash',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'slate_oxide',
        label: 'Concrete Slate & Oxide',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'chiaroscuro_gold',
        label: 'Chiaroscuro Bone & Burnt Amber',
        archetype: 'NEO_RENAISSANCE',
      },
      {
        value: 'tonal_ecru',
        label: 'Pure Monochrome & Warm Ecru',
        archetype: 'MONOLITH_MINIMALIST',
      },
    ],
  },
  {
    step: 3,
    field: 'era',
    question: 'Which design lineage resonates strongest?',
    options: [
      {
        value: 'early_2000s_archive',
        label: '2001–2009 Underground Archive',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'brutalist_future',
        label: 'Industrial Brutalist Utility',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'reborn_artisan',
        label: '1-of-1 Reborn Atelier Customs',
        archetype: 'NEO_RENAISSANCE',
      },
      {
        value: 'timeless_avant',
        label: 'Timeless Gallery Minimalism',
        archetype: 'MONOLITH_MINIMALIST',
      },
    ],
  },
  {
    step: 4,
    field: 'footwear',
    question: 'Anchor the look from the ground up',
    options: [
      {
        value: 'distressed_hightop',
        label: 'Distressed Calfskin High-Tops',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'carbon_runner',
        label: 'Carbon-Sole Technical Runners',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'custom_bespoke',
        label: 'Hand-Aged Bespoke Boots / Grails',
        archetype: 'NEO_RENAISSANCE',
      },
      {
        value: 'clean_derby',
        label: 'Unbranded Monolith Low / Derby',
        archetype: 'MONOLITH_MINIMALIST',
      },
    ],
  },
  {
    step: 5,
    field: 'fabric',
    question: 'Tactile obsession — what touches skin?',
    options: [
      {
        value: 'heavy_french_terry',
        label: '650gsm Sun-Washed Cotton & Horsehide',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'waxed_selvedge',
        label: 'Waxed Selvedge & Ballistic Nylon',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'oxidized_silver_silk',
        label: 'Raw Loomed Linen, Leather & Silver',
        archetype: 'NEO_RENAISSANCE',
      },
      {
        value: 'virgin_wool_cashmere',
        label: 'Double-Faced Virgin Wool & Cashmere',
        archetype: 'MONOLITH_MINIMALIST',
      },
    ],
  },
  {
    step: 6,
    field: 'occasion',
    question: 'Where does your uniform operate?',
    options: [
      {
        value: 'late_studio',
        label: 'After-Hours Sound & Design Studios',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'night_transit',
        label: 'High-Density Urban Transit',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'private_viewing',
        label: 'Private Gallery & Collector Dinners',
        archetype: 'NEO_RENAISSANCE',
      },
      {
        value: 'executive_creative',
        label: 'Creative Direction & Architecture',
        archetype: 'MONOLITH_MINIMALIST',
      },
    ],
  },
  {
    step: 7,
    field: 'grailPriority',
    question: 'What defines a true Grail in your vault?',
    options: [
      {
        value: 'patina_rarity',
        label: 'Impossible-to-Find Archive Year',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'engineered_construction',
        label: 'Complex Pattern & Hardware Spec',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'numbered_edition',
        label: 'Numbered 1-of-1 Provenance',
        archetype: 'NEO_RENAISSANCE',
      },
      {
        value: 'perfect_drape',
        label: 'Flawless Cut & Lifetime Wearability',
        archetype: 'MONOLITH_MINIMALIST',
      },
    ],
  },
  {
    step: 8,
    field: 'riskAppetite',
    question: 'Select your Mystery Vault allocation tier',
    options: [
      {
        value: 'initiate',
        label: 'Initiate Allocation — Essential Curated Entry',
        archetype: 'MONOLITH_MINIMALIST',
      },
      {
        value: 'inner_circle',
        label: 'Inner Circle — High-Heat Archive & Footwear',
        archetype: 'SHADOW_ARCHIVE',
      },
      {
        value: 'vanguard_pack',
        label: 'Vanguard — Multi-Piece Technical Rotation',
        archetype: 'CONCRETE_VANGUARD',
      },
      {
        value: 'grail_vault',
        label: 'Grail Vault — 1-of-1 Customs & Rare Relics',
        archetype: 'NEO_RENAISSANCE',
      },
    ],
  },
];

@Injectable()
export class MysteryBoxesService {
  constructor(
    @InjectRepository(MysteryBox)
    private readonly boxRepo: Repository<MysteryBox>,
    @InjectRepository(StyleProfile)
    private readonly styleProfileRepo: Repository<StyleProfile>,
  ) {}

  getQuizQuestions() {
    return {
      title: 'DECODE YOUR STYLE',
      subtitle: '8-Step Initiation into the Enigma Taste Codex',
      steps: QUIZ_STEPS,
    };
  }

  async findAll(includeInactive = false) {
    const boxes = await this.boxRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { price: 'ASC' },
    });
    return boxes.map((b) => ({
      ...b,
      price: Number(b.price),
      guaranteedMinValue: Number(b.guaranteedMinValue),
    }));
  }

  async decodeStyle(dto: DecodeStyleQuizDto, userId?: number) {
    const scores: Record<ArchetypeKey, number> = {
      SHADOW_ARCHIVE: 0,
      CONCRETE_VANGUARD: 0,
      NEO_RENAISSANCE: 0,
      MONOLITH_MINIMALIST: 0,
    };

    const answers: Record<string, string> = {
      silhouette: dto.silhouette,
      palette: dto.palette,
      era: dto.era,
      footwear: dto.footwear,
      fabric: dto.fabric,
      occasion: dto.occasion,
      grailPriority: dto.grailPriority,
      riskAppetite: dto.riskAppetite,
    };

    for (const step of QUIZ_STEPS) {
      const val = answers[step.field];
      const matched = step.options.find((opt) => opt.value === val);
      if (matched) {
        scores[matched.archetype as ArchetypeKey] +=
          step.field === 'era' || step.field === 'grailPriority' ? 2 : 1;
      } else if (val) {
        const lower = val.toLowerCase();
        if (
          lower.includes('shadow') ||
          lower.includes('archive') ||
          lower.includes('oversized')
        ) {
          scores.SHADOW_ARCHIVE += 1;
        } else if (
          lower.includes('tech') ||
          lower.includes('cargo') ||
          lower.includes('vanguard')
        ) {
          scores.CONCRETE_VANGUARD += 1;
        } else if (
          lower.includes('reborn') ||
          lower.includes('gold') ||
          lower.includes('grail')
        ) {
          scores.NEO_RENAISSANCE += 1;
        } else {
          scores.MONOLITH_MINIMALIST += 1;
        }
      }
    }

    const sorted = (Object.entries(scores) as [ArchetypeKey, number][]).sort(
      (a, b) => b[1] - a[1],
    );
    const topKey = sorted[0][0];
    const totalPoints = Math.max(
      1,
      Object.values(scores).reduce((s, n) => s + n, 0),
    );

    const dnaBreakdown = sorted.map(([key, pts]) => ({
      code: key,
      archetype: TASTE_CODEX_CATALOG[key].archetype,
      affinityPercent: Math.round((pts / totalPoints) * 100),
    }));

    const codex = TASTE_CODEX_CATALOG[topKey];
    let matchedTierSlug = codex.defaultTierSlug;
    if (dto.riskAppetite === 'grail_vault') matchedTierSlug = 'grail-vault';
    else if (dto.riskAppetite === 'initiate') matchedTierSlug = 'initiate-box';
    else if (
      dto.riskAppetite === 'inner_circle' ||
      dto.riskAppetite === 'vanguard_pack'
    ) {
      matchedTierSlug = 'inner-circle-chest';
    }

    const allBoxes = await this.findAll(false);
    const recommendedBox =
      allBoxes.find((b) => b.tierSlug === matchedTierSlug) ??
      allBoxes[0] ??
      null;

    if (userId) {
      const existing = await this.styleProfileRepo.findOneBy({ userId });
      const profile = existing ?? this.styleProfileRepo.create({ userId });
      profile.style = codex.archetype;
      profile.archetype = codex.archetype;
      profile.archetypeCode = codex.code;
      profile.colors = codex.paletteNotes;
      profile.categories = codex.categories;
      profile.keywords = codex.keywords;
      profile.preferredFit = dto.preferredSize ?? dto.silhouette;
      profile.recommendedTier = matchedTierSlug;
      profile.quizAnswers = answers;
      await this.styleProfileRepo.save(profile);
    }

    return {
      archetypeCode: codex.code,
      archetype: codex.archetype,
      motto: codex.motto,
      description: codex.description,
      paletteNotes: codex.paletteNotes,
      categories: codex.categories,
      keywords: codex.keywords,
      dnaBreakdown,
      matchedTierSlug,
      recommendedBox,
      persisted: Boolean(userId),
    };
  }

  async getMyCodex(userId: number) {
    const profile = await this.styleProfileRepo.findOneBy({ userId });
    if (!profile) return null;
    const key =
      (profile.archetypeCode as ArchetypeKey | null) ?? 'SHADOW_ARCHIVE';
    const meta = TASTE_CODEX_CATALOG[key] ?? TASTE_CODEX_CATALOG.SHADOW_ARCHIVE;
    const allBoxes = await this.findAll(false);
    const recommendedBox =
      allBoxes.find((b) => b.tierSlug === profile.recommendedTier) ??
      allBoxes[0] ??
      null;
    return {
      ...profile,
      motto: meta.motto,
      description: meta.description,
      recommendedBox,
    };
  }

  async getAllProfiles() {
    return this.styleProfileRepo.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async create(dto: CreateMysteryBoxDto) {
    const box = this.boxRepo.create({
      ...dto,
      itemCount: dto.itemCount ?? 2,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.boxRepo.save(box);
    return {
      ...saved,
      price: Number(saved.price),
      guaranteedMinValue: Number(saved.guaranteedMinValue),
    };
  }

  async update(id: number, dto: UpdateMysteryBoxDto) {
    const box = await this.boxRepo.findOneBy({ id });
    if (!box) throw new NotFoundException(`MysteryBox id=${id} not found`);
    Object.assign(box, dto);
    const saved = await this.boxRepo.save(box);
    return {
      ...saved,
      price: Number(saved.price),
      guaranteedMinValue: Number(saved.guaranteedMinValue),
    };
  }

  async remove(id: number) {
    const box = await this.boxRepo.findOneBy({ id });
    if (!box) throw new NotFoundException(`MysteryBox id=${id} not found`);
    await this.boxRepo.remove(box);
    return { message: `Deleted mystery box id=${id}` };
  }
}
