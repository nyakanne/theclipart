import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Mail, Phone, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCreateScan } from '@/hooks/useScan'
import { useNavigate } from 'react-router-dom'

const schema = z.object({
  email:        z.string().email().optional().or(z.literal('')),
  phone:        z.string().regex(/^\+?[\d\s\-()]{7,20}$/).optional().or(z.literal('')),
  username:     z.string().min(2).max(64).optional().or(z.literal('')),
  full_name:    z.string().min(2).max(120).optional().or(z.literal('')),
  notify_email: z.string().email().optional().or(z.literal('')),
}).refine(d => d.email || d.phone || d.username || d.full_name, {
  message: 'Provide at least one identifier to search',
})

type FormValues = z.infer<typeof schema>

export function SearchForm() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateScan()

  const {
    register, handleSubmit, formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v && v !== '')
    ) as FormValues
    const job = await mutateAsync(cleaned)
    navigate(`/scan/${job.scan_id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field icon={<Mail className="h-4 w-4" />} label="Email address" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="input-field"
          />
        </Field>

        <Field icon={<Phone className="h-4 w-4" />} label="Phone number" error={errors.phone?.message}>
          <input
            {...register('phone')}
            type="tel"
            placeholder="+1 555 000 0000"
            className="input-field"
          />
        </Field>

        <Field icon={<User className="h-4 w-4" />} label="Username" error={errors.username?.message}>
          <input
            {...register('username')}
            placeholder="johndoe"
            className="input-field"
          />
        </Field>

        <Field icon={<User className="h-4 w-4" />} label="Full name" error={errors.full_name?.message}>
          <input
            {...register('full_name')}
            placeholder="John Doe"
            className="input-field"
          />
        </Field>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <Field icon={<Bell className="h-4 w-4" />} label="Notify me at (optional)" error={errors.notify_email?.message}>
          <input
            {...register('notify_email')}
            type="email"
            placeholder="alerts@example.com"
            className="input-field"
          />
        </Field>
        <p className="mt-1.5 text-xs text-gray-500">
          We'll email you the full report and alert you if your data appears in new breaches.
        </p>
      </div>

      {errors.root && (
        <p className="text-sm text-red-400">{errors.root.message}</p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isPending}
        icon={<Search className="h-5 w-5" />}
        className="w-full"
      >
        {isPending ? 'Queuing scan…' : 'Scan for breaches'}
      </Button>
    </form>
  )
}

interface FieldProps {
  icon: React.ReactNode
  label: string
  error?: string
  children: React.ReactNode
}

function Field({ icon, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400">
        {icon} {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
