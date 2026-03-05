import { httpAction } from '../_generated/server'
import { api } from '../_generated/api'
import { validateFileSignature, validateFileUpload } from './validation'
import type { Id } from '../_generated/dataModel'

const LOCALHOST_FALLBACK_ORIGIN = 'http://localhost:3006'

function parseCsvOrigins(csv?: string): Array<string> {
  if (!csv) {
    return []
  }
  return csv
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

export function getAllowedOriginsFromEnv(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const allowlist = new Set<string>()
  for (const key of ['VITE_APP_URL', 'APP_URL']) {
    const value = env[key]
    if (value) {
      allowlist.add(value)
    }
  }
  for (const origin of parseCsvOrigins(env.CORS_ALLOWED_ORIGINS)) {
    allowlist.add(origin)
  }
  return allowlist
}

/**
 * Get CORS headers for the request
 * In development, allows all localhost origins
 * In production, should be restricted to specific domains
 */
export function getCorsHeaders(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const origin = request.headers.get('origin') || ''
  const allowlist = getAllowedOriginsFromEnv(env)
  const isDevelopment = env.NODE_ENV !== 'production'

  const isLocalhost =
    origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')
  const isAllowed = allowlist.has(origin) || (isDevelopment && isLocalhost)
  const allowOrigin =
    isAllowed ? origin : allowlist.values().next().value ?? LOCALHOST_FALLBACK_ORIGIN
  if (!isAllowed && env.NODE_ENV === 'production' && allowlist.size === 0) {
    console.warn(
      `Upload CORS allowlist is empty in production; using fallback origin ${LOCALHOST_FALLBACK_ORIGIN}. Requested origin: ${origin || '<none>'}`,
    )
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'origin',
  }
}

export function buildInternalUploadErrorBody() {
  return {
    error: 'Internal server error during upload',
  }
}

/**
 * HTTP Action to handle file uploads
 * POST /upload with multipart/form-data
 *
 * Validates file before storing to prevent orphaned files
 * Returns upload metadata on success, error details on failure
 */
export const handleUpload = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request)

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Parse multipart form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const filename = formData.get('filename') as string | null

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Use provided filename or fall back to file.name
  const actualFilename = filename || file.name

  // Validate file BEFORE storing (atomic validation)
  const validationResult = validateFileUpload(file, actualFilename)
  if (!validationResult.valid) {
    const error = validationResult.error!
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }

  try {
    // Store file in Convex storage and validate file signature
    const blob = await file.arrayBuffer()

    // Validate file signature (magic numbers) for security
    const signatureResult = validateFileSignature(blob)
    if (!signatureResult.valid) {
      const error = signatureResult.error!
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }
    const storageId = await ctx.storage.store(
      new Blob([blob], { type: file.type }),
    )

    // Save metadata to database
    const uploadId = await ctx.runMutation(
      api.uploads.mutations.saveFileMetadata,
      {
        storageId,
        filename: actualFilename,
        size: file.size,
        contentType: file.type,
        uploadSource: request.headers.get('user-agent') || undefined,
      },
    )

    // Get storage URL for immediate use
    const storageUrl = await ctx.storage.getUrl(storageId)

    // Trigger async vision analysis for the uploaded file
    let analysisId: Id<"visionAnalysis"> | null = null
    try {
      analysisId = await ctx.runMutation(
        api.vision.mutations.triggerAnalysis,
        { uploadId }
      )
    } catch (analysisError) {
      // Log but don't fail the upload if vision analysis fails to start
      console.error('Failed to trigger vision analysis:', analysisError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        uploadId,
        storageId,
        storageUrl,
        filename: actualFilename,
        size: file.size,
        contentType: file.type,
        analysisId, // Include analysis ID if available
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (error) {
    console.error('Upload failed:', error)
    return new Response(
      JSON.stringify(buildInternalUploadErrorBody()),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
