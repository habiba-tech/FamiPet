// Admin API — backend contract from backend/routes/admin.routes.js. Every
// endpoint is `protect` + `adminOnly` (non-admin gets 403 from the backend),
// matching the Vanilla admin pages' FamiPetAPI calls.

import { apiDelete, apiGet, apiPut } from './client'

export interface AdminUser {
  _id: string
  name: string
  email: string
  avatar?: string
  phone?: string
  role: string
  isVerified?: boolean
  isBlocked?: boolean
  createdAt?: string
}

export interface AdminPet {
  id: string
  name: string
  species?: string
  breed?: string
  age?: number
  gender?: string
  status?: string
  adopted?: boolean
  vaccinated?: boolean
  location?: string
  owner?: { id?: string; name?: string; email?: string } | null
  createdAt?: string
}

export interface AdminLostFoundReport {
  _id: string
  type?: string
  petName?: string
  species?: string
  breed?: string
  gender?: string
  color?: string
  description?: string
  location?: string
  date?: string
  contactName?: string
  contactPhone?: string
  images?: string[]
  status?: string
  createdAt?: string
  user?: { _id?: string; name?: string; email?: string; phone?: string } | string
}

export interface AdminCommunityPost {
  _id: string
  title?: string
  content?: string
  category?: string
  image?: string
  isActive?: boolean
  createdAt?: string
  user?: { _id?: string; name?: string; email?: string; avatar?: string } | string
}

export interface AdminDashboardStats {
  totalUsers: number
  totalPets: number
  availablePets: number
  adoptedPets: number
  pendingAdoptions: number
  lostFoundReports: number
}

export interface AdminUsersResponse {
  success?: boolean
  count?: number
  users?: AdminUser[]
}

export interface AdminPetsResponse {
  success?: boolean
  count?: number
  pets?: AdminPet[]
}

export interface AdminReportsResponse {
  success?: boolean
  count?: number
  reports?: AdminLostFoundReport[]
}

export interface AdminPostsResponse {
  success?: boolean
  count?: number
  posts?: AdminCommunityPost[]
}

export interface AdminDashboardResponse {
  success?: boolean
  stats: AdminDashboardStats
}

/* ---------------- DASHBOARD ---------------- */

export function getDashboardStats(): Promise<AdminDashboardResponse> {
  return apiGet<AdminDashboardResponse>('/admin/dashboard')
}

export function getRecentUsers(): Promise<AdminUsersResponse> {
  return apiGet<AdminUsersResponse>('/admin/users/recent')
}

/* ---------------- USERS ---------------- */

export function getAllUsers(): Promise<AdminUsersResponse> {
  return apiGet<AdminUsersResponse>('/admin/users')
}

export function toggleUserBlock(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiPut<{ success?: boolean; message?: string }>(`/admin/users/${id}/block`, {})
}

export function deleteUser(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete<{ success?: boolean; message?: string }>(`/admin/users/${id}`)
}

/* ---------------- PETS ---------------- */

export function getAllPets(): Promise<AdminPetsResponse> {
  return apiGet<AdminPetsResponse>('/admin/pets')
}

export function deletePet(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete<{ success?: boolean; message?: string }>(`/admin/pets/${id}`)
}

/* ---------------- LOST & FOUND ---------------- */

export function getAllLostFoundReports(): Promise<AdminReportsResponse> {
  return apiGet<AdminReportsResponse>('/admin/lost-found')
}

export function updateLostFoundStatus(
  id: string,
  status: 'active' | 'resolved',
): Promise<{ success?: boolean; message?: string }> {
  return apiPut<{ success?: boolean; message?: string }>(`/admin/lost-found/${id}/status`, { status })
}

export function deleteLostFoundReport(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete<{ success?: boolean; message?: string }>(`/admin/lost-found/${id}`)
}

/* ---------------- COMMUNITY ---------------- */

export function getAllCommunityPosts(): Promise<AdminPostsResponse> {
  return apiGet<AdminPostsResponse>('/admin/community')
}

export function updateCommunityPostStatus(
  id: string,
  isActive: boolean,
): Promise<{ success?: boolean; message?: string }> {
  return apiPut<{ success?: boolean; message?: string }>(`/admin/community/${id}/status`, { isActive })
}

export function deleteCommunityPost(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete<{ success?: boolean; message?: string }>(`/admin/community/${id}`)
}