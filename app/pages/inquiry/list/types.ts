export interface ReportInquiry {
  reportName: string
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
  lastSelected: ReportInquiryAnswerTemplate[]
}

export interface ReportInquiryAnswerTemplate {
  seqNo: number
  templateName: string
  languages: ReportInquiryAnswerTemplateLanguage[]
}

export interface ReportInquiryAnswerTemplateLanguage {
  title: string
  content: string
  languageCode: string
  languageName: string
}

export interface SelectBox {
  content: ReportInquiryAnswerTemplate[]
  totalElements: number
  number: number
  size: number
  first: boolean
  last: boolean
  totalPages: number
}
