import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: `${baseURL}/api` })

export const uploadFile = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload', fd)
}

export const getSummary    = () => api.get('/stats/summary')
export const getRevenue    = (period) => api.get('/stats/revenue-by-period', { params: { period } })
export const getProducts   = (limit = 10) => api.get('/stats/top-products', { params: { limit } })
export const getRegions    = () => api.get('/stats/regions')
export const getForecast   = (periods = 6) => api.get('/stats/forecast', { params: { periods } })
export const sendChat      = (message, history) => api.post('/chat', { message, conversation_history: history })
export const healthCheck   = () => api.get('/health')

export default api