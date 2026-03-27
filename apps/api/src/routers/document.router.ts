import { z } from 'zod'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const UPLOAD_URL_EXPIRY_SECONDS = 3600 // 1 hora

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Serviço de armazenamento não configurado',
    })
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export const documentRouter: TRPCRouter = router({
  getUploadUrl: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .input(
      z.object({
        propertyId: z.string().uuid(),
        filename: z.string().min(1).max(255),
        contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
        sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES, {
          message: 'Arquivo deve ter no máximo 10MB',
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const property = await ctx.db.property.findUnique({
        where: { id: input.propertyId, deletedAt: null },
      })
      if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'Imóvel não encontrado!' })

      const bucket = process.env.R2_BUCKET_NAME
      if (!bucket) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Bucket de armazenamento não configurado',
        })
      }

      const documentId = crypto.randomUUID()
      const ext = input.filename.split('.').pop() ?? ''
      const storageKey = `${ctx.tenantId}/properties/${input.propertyId}/${documentId}.${ext}`

      const r2 = getR2Client()
      const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          ContentType: input.contentType,
          ContentLength: input.sizeBytes,
        }),
        { expiresIn: UPLOAD_URL_EXPIRY_SECONDS },
      )

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${storageKey}`

      const document = await ctx.db.propertyDocument.create({
        data: {
          tenantId: ctx.tenantId,
          propertyId: input.propertyId,
          name: input.filename,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          storageKey,
          url: publicUrl,
        },
      })

      return { uploadUrl, documentId: document.id }
    }),

  list: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const property = await ctx.db.property.findUnique({
        where: { id: input.propertyId, deletedAt: null },
      })
      if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'Imóvel não encontrado!' })

      return ctx.db.propertyDocument.findMany({
        where: { propertyId: input.propertyId },
        orderBy: { createdAt: 'desc' },
      })
    }),

  delete: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.propertyDocument.findUnique({
        where: { id: input.documentId },
      })
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado!' })

      await ctx.db.propertyDocument.delete({ where: { id: input.documentId } })
      return { deleted: true }
    }),
})
