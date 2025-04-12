import type { GetInquiryListRequestBody, InquiryCodes, InquiryProcessHistory, InquiryTemplateList, ReportInquiry, SelfAssignRequestBody, UpdateInquiryRequestBody } from '~/pages/inquiry/list/types'
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

export function selfAssignReportInquiry(body: SelfAssignRequestBody, options?: AppFetchOptions) {
  return useNuxtApp().$api<ApiResponse<null>>(`/inquiries/adviser/self`, {
    method: 'PUT',
    body,
    ...options,
  })
}

export function downloadReportInquiry(body: GetInquiryListRequestBody & { password: string, reason: string }, options?: AppFetchOptions) {
  return useNuxtApp().$api<ApiResponse<ArrayBuffer>>(
    `/help-isvc/v1.0/admin/report/inquiries/excel-download`,
    {
      headers: {
        'x-timezone': useCookie('TZ').value || '',
      },
      method: 'POST',
      responseType: 'arrayBuffer',
      convertResponseToCamelKey: false,
      body,
      ...options,
    },
  )
}
