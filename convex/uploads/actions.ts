import { httpAction } from '../_generated/server'
import { api } from '../_generated/api'
import { validateFileSignature, validateFileUpload } from './validation'
import type { Id } from '../_generated/dataModel'

const HTML_CONTENT_TYPE = 'text/html'
const URL_FETCH_USER_AGENT = "What's Cookin' Recipe Importer/1.0"

/**
 * Get CORS headers for the request
 * In development, allows all localhost origins
 * In production, should be restricted to specific domains
 */
function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') || ''

  // Allow all localhost origins in development
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')

  return {
    'Access-Control-Allow-Origin': isLocalhost ? origin : 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'origin',
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function buildHtmlFilename(url: URL) {
  const leaf = url.pathname.split('/').filter(Boolean).pop() || 'recipe'
  const safeLeaf = leaf.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'recipe'
  const safeHost = url.hostname.replace(/[^a-zA-Z0-9.-]+/g, '')
  return `${safeHost}-${safeLeaf}.html`
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

  // Parse multipart form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const filename = formData.get('filename') as string | null

  if (!file) {
    return jsonResponse({ error: 'No file provided' }, 400, corsHeaders)
  }

  // Use provided filename or fall back to file.name
  const actualFilename = filename || file.name

  // Validate file BEFORE storing (atomic validation)
  const validationResult = validateFileUpload(file, actualFilename)
  if (!validationResult.valid) {
    const error = validationResult.error!
    return jsonResponse(
      {
        error: error.message,
        code: error.code,
      },
      400,
      corsHeaders,
    )
  }

  try {
    // Store file in Convex storage and validate file signature
    const blob = await file.arrayBuffer()

    // Validate file signature (magic numbers) for security
    const signatureResult = validateFileSignature(blob)
    if (!signatureResult.valid) {
      const error = signatureResult.error!
      return jsonResponse(
        {
          error: error.message,
          code: error.code,
        },
        400,
        corsHeaders,
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
    return jsonResponse(
      {
        error: 'Internal server error during upload',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
      corsHeaders,
    )
  }
})

/**
 * HTTP Action to import a recipe page from URL.
 * POST /upload-url with JSON body: { "url": "https://..." }
 */
export const handleUrlUpload = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  let rawUrl: unknown
  try {
    const body = await request.json()
    rawUrl = body?.url
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders)
  }

  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return jsonResponse({ error: 'A valid URL is required' }, 400, corsHeaders)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return jsonResponse({ error: 'URL must start with http:// or https://' }, 400, corsHeaders)
    }
  } catch {
    return jsonResponse({ error: 'Invalid URL format' }, 400, corsHeaders)
  }

  try {
    const recipePageResponse = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': URL_FETCH_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    if (!recipePageResponse.ok) {
      return jsonResponse(
        {
          error: `Failed to fetch URL (status ${recipePageResponse.status})`,
        },
        400,
        corsHeaders,
      )
    }

    const html = await recipePageResponse.text()
    if (!html.trim()) {
      return jsonResponse({ error: 'Fetched page had no HTML content' }, 400, corsHeaders)
    }

    const htmlBlob = new Blob([html], { type: HTML_CONTENT_TYPE })
    const storageId = await ctx.storage.store(htmlBlob)
    const filename = buildHtmlFilename(parsedUrl)

    const uploadId = await ctx.runMutation(
      api.uploads.mutations.saveFileMetadata,
      {
        storageId,
        filename,
        size: htmlBlob.size,
        contentType: HTML_CONTENT_TYPE,
        uploadSource: request.headers.get('user-agent') || undefined,
        sourceUrl: parsedUrl.toString(),
      },
    )

    const storageUrl = await ctx.storage.getUrl(storageId)

    let analysisId: Id<'visionAnalysis'> | null = null
    try {
      analysisId = await ctx.runMutation(
        api.vision.mutations.triggerAnalysis,
        { uploadId },
      )
    } catch (analysisError) {
      console.error('Failed to trigger URL vision analysis:', analysisError)
    }

    return jsonResponse(
      {
        success: true,
        uploadId,
        analysisId,
        storageId,
        storageUrl,
        filename,
        size: htmlBlob.size,
        contentType: HTML_CONTENT_TYPE,
        sourceUrl: parsedUrl.toString(),
      },
      201,
      corsHeaders,
    )
  } catch (error) {
    console.error('URL import failed:', error)
    return jsonResponse(
      {
        error: 'Internal server error during URL import',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
      corsHeaders,
    )
  }
})
