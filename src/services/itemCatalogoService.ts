import api from './api'
import type { ItemCatalogoRequest, ItemCatalogoResponse } from '../types/itemCatalogo'

export const itemCatalogoService = {
  listar: async (catalogoId: string): Promise<ItemCatalogoResponse[]> => {
    const response = await api.get(`/catalogos/${catalogoId}/itens`)
    return response.data
  },

  adicionar: async (catalogoId: string, data: ItemCatalogoRequest): Promise<ItemCatalogoResponse> => {
    const response = await api.post(`/catalogos/${catalogoId}/itens`, data)
    return response.data
  },

  editar: async (catalogoId: string, itemId: string, data: ItemCatalogoRequest): Promise<ItemCatalogoResponse> => {
    const response = await api.put(`/catalogos/${catalogoId}/itens/${itemId}`, data)
    return response.data
  },

  remover: async (catalogoId: string, itemId: string): Promise<void> => {
    await api.delete(`/catalogos/${catalogoId}/itens/${itemId}`)
  },
}
