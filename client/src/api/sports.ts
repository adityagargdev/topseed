import api from '../lib/axios'
import { Sport } from '../types'

export const sportApi = {
  list: () => api.get<Sport[]>('/sports').then(r => r.data),
}
