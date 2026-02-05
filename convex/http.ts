import { httpRouter } from 'convex/server'
import { handleUpload } from './uploads/actions'

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

export default http
