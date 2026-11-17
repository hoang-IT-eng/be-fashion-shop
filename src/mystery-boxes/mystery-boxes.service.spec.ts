import { Repository } from 'typeorm';
import { MysteryBoxesService } from './mystery-boxes.service';
import { MysteryBox } from './mystery-box.entity';
import { StyleProfile } from '../ai-chat/entities/style-profile.entity';

describe('MysteryBoxesService', () => {
  let service: MysteryBoxesService;
  let savedProfile: Partial<StyleProfile> | null = null;

  beforeEach(() => {
    savedProfile = null;
    const boxRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          tierSlug: 'initiate-box',
          name: 'Initiate Box',
          price: 3490000,
          guaranteedMinValue: 5200000,
          itemCount: 2,
          isActive: true,
        },
        {
          id: 2,
          tierSlug: 'grail-vault',
          name: 'Grail Vault',
          price: 15900000,
          guaranteedMinValue: 24500000,
          itemCount: 4,
          isActive: true,
        },
      ]),
    } as unknown as Repository<MysteryBox>;

    const profileRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((p: Partial<StyleProfile>) => ({ ...p })),
      save: jest.fn().mockImplementation((p: Partial<StyleProfile>) => {
        savedProfile = p;
        return Promise.resolve(p);
      }),
    } as unknown as Repository<StyleProfile>;

    service = new MysteryBoxesService(boxRepo, profileRepo);
  });

  it('computes Neo-Renaissance Taste Codex and persists profile for authenticated user', async () => {
    const result = await service.decodeStyle(
      {
        silhouette: 'bespoke_sculpted',
        palette: 'chiaroscuro_gold',
        era: 'reborn_artisan',
        footwear: 'custom_bespoke',
        fabric: 'oxidized_silver_silk',
        occasion: 'private_viewing',
        grailPriority: 'numbered_edition',
        riskAppetite: 'grail_vault',
        preferredSize: 'L',
      },
      42,
    );

    expect(result.archetypeCode).toBe('NEO_RENAISSANCE');
    expect(result.archetype).toBe('Neo-Renaissance');
    expect(result.matchedTierSlug).toBe('grail-vault');
    expect(result.recommendedBox?.name).toBe('Grail Vault');
    expect(result.persisted).toBe(true);
    expect(savedProfile?.archetypeCode).toBe('NEO_RENAISSANCE');
  });
});
