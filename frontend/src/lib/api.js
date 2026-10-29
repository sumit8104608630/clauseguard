/**
 * Thin fetch wrapper around the FastAPI backend.
 *
 * All requests go through the Vite dev proxy (`/api` -> `http://127.0.0.1:8000`),
 * so auth is carried by the httpOnly cookies the backend sets on login.
 * `credentials: 'include'` is what makes those cookies travel with the request.
 */

const BASE_URL = '/api'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** FastAPI can return several error shapes. Normalise them to one string. */
function extractErrorMessage(data, status) {
  if (!data) return `Request failed (${status})`

  if (typeof data === 'string') return data

  const { detail } = data

  if (typeof detail === 'string') return detail

  // Validation errors: detail: [{ loc, msg, type }]
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc.slice(-1)[0] : null
        return field ? `${field}: ${item.msg}` : item.msg
      })
      .join(', ')
  }

  // Custom error object: detail: { message }
  if (detail && typeof detail === 'object') {
    return detail.message || JSON.stringify(detail)
  }

  return `Request failed (${status})`
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = {}
  let payload = body

  // FormData must NOT get a manual Content-Type: the browser adds the
  // multipart boundary itself, and overriding it breaks the upload.
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: payload,
      credentials: 'include',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }

  if (response.status === 204) return null

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, response.status), response.status)
  }

  return data
}

export const api = {
  // ---- auth ------------------------------------------------------------
  register: (payload) =>
    request('/user/register', { method: 'POST', body: payload }),

  login: (email, password) =>
    request('/user/login', { method: 'POST', body: { email, password } }),

  logout: () => request('/user/logout', { method: 'POST' }),

  // ---- contracts -------------------------------------------------------
  listContracts: ({ page = 1, size = 10 } = {}) =>
    request(`/contracts/?page=${page}&size=${size}`),

  getContract: (contractId) => request(`/contracts/${contractId}`),

  uploadContract: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/contracts/upload', { method: 'POST', body: formData })
  },

  processContract: (contractId) =>
    request(`/contracts/${contractId}/process`, { method: 'POST' }),

  getClauses: (contractId) => request(`/contracts/${contractId}/clauses`),

  // ---- analysis --------------------------------------------------------
  runAnalysis: (contractId) =>
    request(`/analysis/${contractId}/run`, { method: 'POST' }),

  getAnalysis: (contractId) => request(`/analysis/${contractId}/results`),

  // ---- chat ------------------------------------------------------------
  getChatHistory: (contractId) => request(`/chat/${contractId}/history`),

  // ---- misc ------------------------------------------------------------
  health: () => request('/health'),
}

/**
 * Stream an answer to a question about one contract.
 *
 * The endpoint replies with Server-Sent Events, and `EventSource` cannot send a
 * POST body (or our cookies), so we read the body stream ourselves and decode
 * the `data:` frames by hand.
 *
 * Resolves when the stream ends. Throws `ApiError` on an HTTP error or on an
 * `error` frame from the server.
 */
export async function streamChat(contractId, question, handlers = {}) {
  const { onCitations, onToken, signal } = handlers

  let response
  try {
    response = await fetch(`${BASE_URL}/chat/${contractId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      credentials: 'include',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }

  if (!response.ok) {
    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    throw new ApiError(extractErrorMessage(data, response.status), response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Frames are separated by a blank line: "data: {...}\n\n".
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      const dataLine = frame
        .split('\n')
        .find((line) => line.startsWith('data:'))
      if (dataLine) {
        const payload = JSON.parse(dataLine.slice('data:'.length).trim())

        if (payload.type === 'token') {
          answer += payload.content
          onToken?.(payload.content)
        } else if (payload.type === 'citations') {
          onCitations?.(payload.clause_ids ?? [])
        } else if (payload.type === 'error') {
          throw new ApiError(payload.message, 0)
        }
      }

      boundary = buffer.indexOf('\n\n')
    }
  }

  return answer
}
