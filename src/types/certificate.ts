
export interface Certificate {
  certificateUid: string
  userUid: string
  courseUid: string
  issuedAt: Date
  certificateUrl: string | null
}

export interface CertificateWithCourse extends Certificate {
  course: {
    courseUid: string
    title: string
    thumbnailUrl: string | null
  }
}
