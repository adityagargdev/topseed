import axios from 'axios'
import { auth } from '../firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL ? `${import.meta.env.VITE_SERVER_URL}/api` : '/api',
})

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message ?? err.message ?? 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
