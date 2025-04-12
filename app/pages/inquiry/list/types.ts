export interface ReportInquiry {
  reportName: string
  reportDiv: string
  seqNo: number
  ticketNo: number
  status: string
  statusDetail: string
  lossStartedAt: string
  lossEndedAt: string
  title: string
  content: string
  createdAt: string
  inquiryCount: number
  memberNo: number
  guid: number
  nation: string
  language: string
  statusModifyAt: string
  answerCreatedAt: string
  adviserId: string
  adviserName: string
  relay: boolean
}

export interface InquiryCodes {
  reportTypes: CodeNameOption[]
  reportStatuses: ReportStatus[]
  reportSearchTypes: CodeNameOption[]
  reportRelayStatus: CodeNameOption[]
  reportDatePeriodTypes: CodeNameOption[]
}

export interface ReportStatus extends CodeNameOption {
  statusDetails: StatusDetail[]
}

export interface StatusDetail extends CodeNameOption {
  reportTypeId?: string
}

export interface InquiryTemplateList {
  selectBox: SelectBox
  lastSelected: InquiryAnswerTemplate[]
}

export interface InquiryAnswerTemplate {
  seqNo: number
  templateName: string
  languages: InquiryAnswerTemplateLanguage[]
}

export interface InquiryAnswerTemplateLanguage {
  title: string
  content: string
  languageCode: string
  languageName: string
}

export interface SelectBox {
  content: InquiryAnswerTemplate[]
  totalElements: number
  number: number
  size: number
  first: boolean
  last: boolean
  totalPages: number
}

export interface InquiryProcessHistory {
  no: string
  changeStatus: string
  changeStatusCode: string
  status: string
  statusDetail: string
  answerCreatedAt?: string
  adviserName: string
  adviserId: string
  memo: string
  statusModifyAt?: string
}

export const INQUIRY_PROGRESS_COLUMN = {
  ORDER: 'order',
  PROCESS_CONTENT: 'process_content',
  STATUS: 'status',
  DETAIL_STATUS: 'detail_status',
  STATUS_CHANGE_DATE: 'status_change_date',
  ANSWER_DATE: 'answer_date',
  ADVISER: 'adviser',
  MEMO: 'memo',
} as const

export interface UpdateInquiryRequestBody {
  bulkUpdateReportStatus?: {
    reportSeqNos: number[]
    reportDiv: string
    status: string | undefined
    detailStatus: string | undefined
    memo: string | undefined
    bulkAnswerRequest?: {
      answerTemplateSeqNo: number | undefined
      templateLanguageCode: string | undefined
      answerTitle: string
      answerContent: string
    }
  }
  bulkUpdateObjectionStatus?: {
    reportSeqNos: number[]
    reportDiv: string
    status: string | undefined
    detailStatus: string | undefined
    memo: string | undefined
    bulkAnswerRequest?: {
      answerTemplateSeqNo: number | undefined
      templateLanguageCode: string | undefined
      answerTitle: string
      answerContent: string
    }
  }
}

export interface SelfAssignRequestBody {
  reportSeqNos: number[]
  memo?: string
  serviceId: string
}

export interface GetInquiryListRequestBody {
  serviceIds: string[]
  reportDiv: string
  statusInfo: {
    status: string[] | undefined
    statusDetail: string[] | undefined
  }
  periodInfo: {
    period: string
    from: string
    to: string
  }
  searchType: string
  searchValue: string
  languageCode: string[]
  relay: string | boolean
  adviser: boolean
  page: number
  size: number
  sort: string
}

export interface ChangeStatusAnswerFormValue {
  bulkUpdateReportStatus: ChangeStatusAnswerForm
  bulkUpdateObjectionStatus: ChangeStatusAnswerForm
}

interface ChangeStatusAnswerForm {
  status: string
  detailStatus: string
  memo: string
  bulkAnswerRequest: {
    answerTemplateSeqNo: number | undefined
    templateLanguageCode: string | undefined
    answerTitle: string
    answerContent: string
  }
}
