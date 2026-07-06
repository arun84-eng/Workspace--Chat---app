import { http } from '../lib/http'
import type { FileAttachment } from '../types/api'

export const filesApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<FileAttachment>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // /download/{file_id} requires a Bearer token (per openapi.json security),
  // so a plain <a href> won't work — the browser won't attach our auth
  // header to a direct navigation. Fetch as a blob and trigger the save
  // ourselves instead.
  download: async (fileId: number, filename?: string) => {
    const res = await http.get(`/download/${fileId}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ?? `file-${fileId}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
