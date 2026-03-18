import { ref } from "vue"
import * as E from "fp-ts/Either"
import { useToast } from "./toast"
import { useI18n } from "./i18n"

export type UploadType = "org-logo"

export interface UploadResult {
  success: boolean
  url?: string
  message?: string
  statusCode?: number
}

export interface UploadError {
  message: string
  statusCode?: number
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const UPLOAD_TIMEOUT_MS = 30000 // 30 seconds
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * Validates an image file before upload
 * @param file The file to validate
 * @returns null if valid, error message string if invalid
 */
export function validateImageFile(file: File): string | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return "file_upload.error_size_limit"
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "file_upload.error_invalid_format"
  }

  return null
}

/**
 * Creates a preview URL for an image file
 * @param file The file to preview
 * @returns Preview URL (remember to revoke with URL.revokeObjectURL when done)
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Composable for handling file uploads with validation and error handling
 */
export function useFileUpload() {
  const toast = useToast()
  const t = useI18n()
  const uploading = ref(false)
  const previewUrl = ref<string | null>(null)

  /**
   * Uploads a file to the backend (organization logos only)
   * @param file The file to upload
   * @param uploadType Type of upload (org-logo)
   * @param orgId Organization ID for org logo uploads
   * @param getAuthConfig Function to get axios auth configuration
   * @returns Either error or upload result
   */
  const uploadFile = async (
    file: File,
    uploadType: UploadType,
    orgId: string | null,
    getAuthConfig: () => Promise<{
      headers: Record<string, string>
      withCredentials?: boolean
    }>
  ): Promise<E.Either<UploadError, UploadResult>> => {
    // Validate file
    const validationError = validateImageFile(file)
    if (validationError) {
      return E.left({
        message: validationError,
      })
    }

    // Validate backend URL early to fail fast
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL
    if (!backendUrl) {
      return E.left({
        message: "file_upload.error_missing_backend_url",
      })
    }

    // Validate backend URL format to prevent SSRF attacks
    try {
      const url = new URL(backendUrl)
      // Ensure it's HTTP/HTTPS protocol
      if (!["http:", "https:"].includes(url.protocol)) {
        console.error(
          "Invalid backend URL protocol (expected http/https):",
          url.protocol
        )
        return E.left({
          message: "file_upload.error_invalid_backend_url",
        })
      }
    } catch (error) {
      // Don't expose the malformed URL in error messages for security
      console.error("Invalid backend URL format:", error)
      return E.left({
        message: "file_upload.error_invalid_backend_url",
      })
    }

    uploading.value = true

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Get auth configuration
      const authConfig = await getAuthConfig()

      let endpoint: string

      if (uploadType === "org-logo" && orgId) {
        // Validate orgId to prevent path traversal attacks
        // Organization IDs are derived from domains and must be lowercase alphanumeric with hyphens
        if (!/^[a-z0-9-]+$/.test(orgId)) {
          console.error("Invalid organization ID format:", orgId)
          return E.left({
            message: "file_upload.error_invalid_org_id",
          })
        }
        endpoint = `${backendUrl}/upload/organization/${orgId}/logo`
      } else {
        return E.left({
          message: "file_upload.error_invalid_upload_type",
        })
      }

      // Make upload request with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
      let response: Response
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...authConfig.headers,
          },
          body: formData,
          credentials: authConfig.withCredentials ? "include" : "same-origin",
          signal: controller.signal,
        })
      } catch (error: unknown) {
        // Fetch throws DOMException with name "AbortError" when aborted (e.g., timeout via AbortController).
        // Browsers may also throw a TypeError for network failures, but we handle those generically.
        // See: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#exceptions
        if (error instanceof DOMException && error.name === "AbortError") {
          return E.left({
            message: "file_upload.error_timeout",
          })
        }
        // Handle network errors or other fetch failures
        console.error("Upload fetch error:", error)
        return E.left({
          message: "file_upload.error_network_failed",
        })
      } finally {
        clearTimeout(timeoutId)
      }

      let result: UploadResult
      try {
        result = await response.json()
      } catch (error: unknown) {
        console.error("Failed to parse upload response:", error)
        return E.left({
          message: "file_upload.error_upload_failed",
          statusCode: response.status,
        })
      }

      if (!response.ok || !result.success) {
        return E.left({
          message: result.message || "file_upload.error_upload_failed",
          statusCode: result.statusCode || response.status,
        })
      }

      return E.right(result)
    } finally {
      uploading.value = false
    }
  }

  /**
   * Handles file selection with preview
   * @param event File input change event
   * @returns Selected file or null
   */
  const handleFileSelect = (
    event: Event
  ): { file: File; preview: string } | null => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return null

    // Validate file
    const validationError = validateImageFile(file)
    if (validationError) {
      toast.error(t(validationError))
      return null
    }

    // Create preview
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = createImagePreview(file)

    return {
      file,
      preview: previewUrl.value,
    }
  }

  /**
   * Cleans up preview URL
   */
  const cleanupPreview = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
  }

  return {
    uploading,
    previewUrl,
    uploadFile,
    handleFileSelect,
    cleanupPreview,
    validateImageFile,
    createImagePreview,
  }
}
