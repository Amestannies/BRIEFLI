"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const prisma_service_1 = require("../../prisma/prisma.service");
const shared_1 = require("@briefli/shared");
const crypto_1 = require("crypto");
let DocumentsService = class DocumentsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
        this.bucket = process.env.AWS_S3_BUCKET ?? 'briefli-documents';
    }
    async getPresignedUploadUrl(firmId, fileName, mimeType) {
        if (!shared_1.ALLOWED_MIME_TYPES.includes(mimeType)) {
            throw new common_1.BadRequestException(`File type not allowed: ${mimeType}`);
        }
        const ext = fileName.split('.').pop() ?? '';
        const fileKey = `${firmId}/${(0, crypto_1.randomUUID)()}${ext ? '.' + ext : ''}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: fileKey,
            ContentType: mimeType,
            ServerSideEncryption: 'AES256',
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 900 });
        return { uploadUrl, fileKey };
    }
    async confirmUpload(firmId, uploadedById, data) {
        const fileSize = data.fileSize;
        if (fileSize > shared_1.MAX_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException(`File too large. Max size is ${shared_1.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
        }
        return this.prisma.document.create({
            data: {
                firmId,
                uploadedById,
                fileKey: data.fileKey,
                fileName: data.fileName,
                mimeType: data.mimeType,
                fileSize,
                caseId: data.caseId,
                clientId: data.clientId,
                folder: data.folder ?? 'general',
                tags: data.tags ?? [],
            },
            include: {
                case: { select: { id: true, title: true, internalRef: true } },
            },
        });
    }
    async findAll(firmId, query) {
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
        const uploaderIds = [...new Set(docs.map((d) => d.uploadedById))];
        const uploaders = await this.prisma.user.findMany({
            where: { id: { in: uploaderIds } },
            select: { id: true, firstName: true, lastName: true },
        });
        const uploaderMap = Object.fromEntries(uploaders.map((u) => [u.id, u]));
        return docs.map((d) => ({ ...d, uploadedBy: uploaderMap[d.uploadedById] ?? null }));
    }
    async findOne(firmId, id) {
        const doc = await this.prisma.document.findFirst({
            where: { id, firmId, deletedAt: null },
            include: { case: { select: { id: true, title: true, internalRef: true } } },
        });
        if (!doc)
            throw new common_1.NotFoundException('Document not found');
        return doc;
    }
    async getStats(firmId) {
        const docs = await this.prisma.document.findMany({
            where: { firmId, deletedAt: null },
            select: { folder: true, fileSize: true, mimeType: true, createdAt: true },
        });
        const totalSize = docs.reduce((acc, d) => acc + d.fileSize, 0);
        const byFolder = {};
        const byType = {};
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
    async getPresignedDownloadUrl(firmId, id) {
        const doc = await this.findOne(firmId, id);
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: doc.fileKey,
            ResponseContentDisposition: `attachment; filename="${doc.fileName}"`,
        });
        const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 300 });
        return { downloadUrl, fileName: doc.fileName };
    }
    async update(firmId, id, data) {
        await this.findOne(firmId, id);
        const { fileName, folder, tags } = data;
        return this.prisma.document.update({
            where: { id },
            data: {
                ...(fileName && { fileName }),
                ...(folder && { folder }),
                ...(tags && { tags }),
            },
        });
    }
    async remove(firmId, id) {
        const doc = await this.findOne(firmId, id);
        await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
        return { deleted: true, id: doc.id };
    }
    async search(firmId, q, caseId) {
        if (!q || q.trim().length < 2)
            return { results: [] };
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
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentsService);
