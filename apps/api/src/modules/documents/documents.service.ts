import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@briefli/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  private readonly s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  private readonly bucket = process.env.AWS_S3_BUCKET ?? 'briefli-documents';

  constructor(private readonly prisma: PrismaService) {}

  // ─── Upload flow ──────────────────────────────────────────────────────────

  async getPresignedUploadUrl(firmId: string, fileName: string, mimeType: string) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(`File type not allowed: ${mimeType}`);
    }
    const ext = fileName.split('.').pop() ?? '';
    const fileKey = `${firmId}/${randomUUID()}${ext ? '.' + ext : ''}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    return { uploadUrl, fileKey };
  }

  async confirmUpload(firmId: string, uploadedById: string, data: Record<string, unknown>) {
    const fileSize = data.fileSize as number;
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File too large. Max size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }
    return this.prisma.document.create({
      data: {
        firmId,
        uploadedById,
        fileKey: data.fileKey as string,
        fileName: data.fileName as string,
        mimeType: data.mimeType as string,
        fileSize,
        caseId: data.caseId as string | undefined,
        clientId: data.clientId as string | undefined,
        folder: (data.folder as string) ?? 'general',
        tags: (data.tags as string[]) ?? [],
      },
      include: {
        case: { select: { id: true, title: true, internalRef: true } },
      },
    });
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async findAll(firmId: string, query: Record<string, string>) {
    const { caseId, folder, search, clientId } = query;

    const docs = await this.prisma.document.findMany({
      where: {
        firmId,
        deletedAt: null,
        ...(caseId && { caseId }),
        ...(clientId && { clientId }),
        ...(folder && folder !== 'all' && { folder }),
        ...(search && {
          OR: [
            { fileName: { contains: search, mode: 'insensitive' } },
            { tags: { has: search } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        case: { select: { id: true, title: true, internalRef: true } },
      },
    });

    // Attach uploader names via batch lookup
    const uploaderIds = [...new Set(docs.map((d) => d.uploadedById))];
    const uploaders = await this.prisma.user.findMany({
      where: { id: { in: uploaderIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const uploaderMap = Object.fromEntries(uploaders.map((u) => [u.id, u]));

    return docs.map((d) => ({ ...d, uploadedBy: uploaderMap[d.uploadedById] ?? null }));
  }

  async findOne(firmId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, firmId, deletedAt: null },
      include: { case: { select: { id: true, title: true, internalRef: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async getStats(firmId: string) {
    const docs = await this.prisma.document.findMany({
      where: { firmId, deletedAt: null },
      select: { folder: true, fileSize: true, mimeType: true, createdAt: true },
    });

    const totalSize = docs.reduce((acc, d) => acc + d.fileSize, 0);
    const byFolder: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const doc of docs) {
      byFolder[doc.folder] = (byFolder[doc.folder] ?? 0) + 1;
      const ext = doc.mimeType.includes('pdf') ? 'pdf'
        : doc.mimeType.includes('word') ? 'docx'
        : doc.mimeType.includes('sheet') || doc.mimeType.includes('excel') ? 'xlsx'
        : doc.mimeType.startsWith('image/') ? 'image'
        : 'other';
      byType[ext] = (byType[ext] ?? 0) + 1;
    }

    return { total: docs.length, totalSize, byFolder, byType };
  }

  // ─── Download ─────────────────────────────────────────────────────────────

  async getPresignedDownloadUrl(firmId: string, id: string) {
    const doc = await this.findOne(firmId, id);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: doc.fileKey,
      ResponseContentDisposition: `attachment; filename="${doc.fileName}"`,
    });
    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { downloadUrl, fileName: doc.fileName };
  }

  // ─── Mutate ───────────────────────────────────────────────────────────────

  async update(firmId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(firmId, id);
    const { fileName, folder, tags } = data as { fileName?: string; folder?: string; tags?: string[] };
    return this.prisma.document.update({
      where: { id },
      data: {
        ...(fileName && { fileName }),
        ...(folder && { folder }),
        ...(tags && { tags }),
      },
    });
  }

  async remove(firmId: string, id: string) {
    const doc = await this.findOne(firmId, id);
    // Soft-delete DB record (keep S3 object for audit trail)
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true, id: doc.id };
  }

  async search(firmId: string, q: string, caseId?: string) {
    if (!q || q.trim().length < 2) return { results: [] };
    const results = await this.prisma.document.findMany({
      where: {
        firmId,
        deletedAt: null,
        ...(caseId && { caseId }),
        OR: [
          { fileName: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
          { ocrText: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { case: { select: { id: true, title: true, internalRef: true } } },
      take: 20,
    });
    return { results };
  }
}
