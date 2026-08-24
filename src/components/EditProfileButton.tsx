"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EditProfileDialog } from "./EditProfileDialog"
import { Edit } from "lucide-react"

interface EditProfileButtonProps {
  user: {
    name: string | null
    bio: string | null
    avatarUrl: string | null
    firstName: string | null
    lastName: string | null
    middleName: string | null
    phone: string | null
    city: string | null
    country: string | null
    timezone: string | null
    organization: string | null
    position: string | null
    subjects: string | null
    gradeLevel: string | null
    experienceYears: number | null
    education: string | null
    websiteUrl: string | null
    telegram: string | null
    vk: string | null
    linkedin: string | null
    isProfilePublic: boolean | null
  }
}

export function EditProfileButton({ user }: EditProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Edit className="h-4 w-4 mr-2" />
        Редактировать профиль
      </Button>
      <EditProfileDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        user={user}
      />
    </>
  )
}
