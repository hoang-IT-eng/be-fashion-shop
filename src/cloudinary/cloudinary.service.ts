import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly cfg: ConfigService) {
    cloudinary.config({
      cloud_name: cfg.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: cfg.get<string>('CLOUDINARY_API_KEY'),
      api_secret: cfg.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'fashion-shop',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Build an optimized delivery URL (auto format/quality, optional resize).
   * Accepts a full Cloudinary URL or a public_id. Non-Cloudinary URLs are returned as-is.
   */
  getOptimizedUrl(
    imageUrlOrPublicId: string,
    options?: { width?: number; height?: number; crop?: string },
  ): string {
    if (!imageUrlOrPublicId) return imageUrlOrPublicId;

    const transforms: string[] = ['f_auto', 'q_auto'];
    if (options?.width) transforms.push(`w_${options.width}`);
    if (options?.height) transforms.push(`h_${options.height}`);
    if (options?.crop) transforms.push(`c_${options.crop}`);
    else if (options?.width || options?.height) transforms.push('c_fill');

    const transformation = transforms.join(',');

    // Already a Cloudinary delivery URL — inject / insert transforms after /upload/
    const uploadMarker = '/upload/';
    if (
      imageUrlOrPublicId.includes('res.cloudinary.com') &&
      imageUrlOrPublicId.includes(uploadMarker)
    ) {
      const [before, after] = imageUrlOrPublicId.split(uploadMarker);
      // Avoid double-injecting if transforms already present
      if (/^f_auto|q_auto|w_\d|c_/.test(after)) {
        return imageUrlOrPublicId;
      }
      return `${before}${uploadMarker}${transformation}/${after}`;
    }

    // Treat as public_id
    try {
      return cloudinary.url(imageUrlOrPublicId, {
        secure: true,
        transformation: [
          { fetch_format: 'auto', quality: 'auto' },
          ...(options?.width || options?.height
            ? [
                {
                  width: options?.width,
                  height: options?.height,
                  crop: options?.crop ?? 'fill',
                },
              ]
            : []),
        ],
      });
    } catch {
      return imageUrlOrPublicId;
    }
  }
}
