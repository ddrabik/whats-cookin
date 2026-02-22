import { httpRouter } from 'convex/server'
import { handleUpload, handleUrlUpload } from './uploads/actions'

const http = httpRouter()

/**
 * File upload endpoint
 * POST /upload with multipart/form-data
 * Accepts: file (File), filename (optional string)
 */
http.route({
  path: '/upload',
  method: 'POST',
  handler: handleUpload,
})

/**
 * CORS preflight handler for upload endpoint
 * Allows cross-origin uploads from frontend
 * Now handled directly in handleUpload action
 */
http.route({
  path: '/upload',
  method: 'OPTIONS',
  handler: handleUpload,
})

/**
 * Recipe URL import endpoint
 * POST /upload-url with JSON body: { url: "https://..." }
 */
http.route({
  path: '/upload-url',
  method: 'POST',
  handler: handleUrlUpload,
})

/**
 * CORS preflight handler for URL import endpoint
 */
http.route({
  path: '/upload-url',
  method: 'OPTIONS',
  handler: handleUrlUpload,
})

export default http
