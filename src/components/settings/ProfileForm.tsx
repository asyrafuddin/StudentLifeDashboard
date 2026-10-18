import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/form/FormField'
import { NativeSelect } from '@/components/form/NativeSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { type ProfileFormInput, type ProfileFormValues, profileSchema } from '@/lib/schemas'
import { updateProfile } from '@/services/profile'
import type { Profile } from '@/types/database'

interface ProfileFormProps {
  profile: Profile
  onSaved: (profile: Profile) => void
}

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const timezones = useMemo(() => {
    const all = Intl.supportedValuesOf('timeZone')
    // Keep the saved value selectable even if this browser doesn't list it (e.g. "UTC").
    return all.includes(profile.timezone) ? all : [profile.timezone, ...all]
  }, [profile.timezone])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name,
      university_name: profile.university_name ?? '',
      timezone: profile.timezone,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await updateProfile(profile.id, values)
      // Make the saved values the new baseline, so "Save" disables again.
      reset({
        display_name: saved.display_name,
        university_name: saved.university_name ?? '',
        timezone: saved.timezone,
      })
      onSaved(saved)
      toast.success('Profile saved')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Display name" error={errors.display_name?.message}>
        <Input autoComplete="name" {...register('display_name')} />
      </FormField>
      <FormField label="University" error={errors.university_name?.message} hint="Optional">
        <Input autoComplete="organization" placeholder="e.g. Example University" {...register('university_name')} />
      </FormField>
      <FormField
        label="Timezone"
        error={errors.timezone?.message}
        // Honest about what this does: the app displays times in device time.
        hint={`Your usual timezone. Times are shown in this device's timezone (${browserTimezone}); the dashboard tells you if the two differ.`}
      >
        <NativeSelect {...register('timezone')}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll('_', ' ')}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        Save changes
      </Button>
    </form>
  )
}
