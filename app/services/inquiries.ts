import type { InquiryCodes, InquiryProcessHistory, InquiryTemplateList, ReportInquiry, UpdateInquiryRequestBody } from '~/pages/inquiry/list/types'
import type { AppFetchOptions } from '~/plugins/api'

export function getInquiries(query: Record<string, any>, options?: AppFetchOptions) {
  return useNuxtApp().$api<PaginatedResponse2<ReportInquiry>>('/inquiries/list', { ...options, query })
}

export function getServices() {
  return useNuxtApp().$api<ApiResponse<Service[]>>('/services')
}

export function getServiceLanguages(serviceId: string) {
  return useNuxtApp().$api<ApiResponse<CodeNameOption[]>>(`/services/${serviceId}/languages`)
}

export function getCommonCodes() {
  return useNuxtApp().$api<ApiResponse<InquiryCodes>>('/inquiries/codes')
}

export function getInquiryTemplateAnswer(serviceId: string) {
  return useNuxtApp().$api<ApiResponse<InquiryTemplateList>>(`/inquiries/services/${serviceId}/answer-templates`)
}

export function getInquiryProgressHistory(inquiryId: string | number, query?: { sort: string, page: number, size?: number }) {
  return useNuxtApp().$api<PaginatedResponse2<InquiryProcessHistory>>(`/inquiries/${inquiryId}/history`, { query })
}

export function updateStatusBulk(body: UpdateInquiryRequestBody) {
  return useNuxtApp().$api<ApiResponse<null>>(`/inquiries/update-status-bulk`, {
    body,
    method: 'PUT',
  })
}
