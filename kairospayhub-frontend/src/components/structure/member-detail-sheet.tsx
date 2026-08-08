import { useState } from 'react'
import { Activity, Coins, FileText, GitBranch, LayoutGrid, Pencil } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { formatOccupationStatus } from '@/lib/member-filters'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import { StructureChain } from '@/components/structure/structure-chain'
import { RoleBadge, StructureSegmentBadge } from '@/components/structure/structure-badges'
import { SideSheet } from '@/components/ui/side-sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DetailTab = 'overview' | 'structure' | 'records' | 'giving' | 'activity'

const DETAIL_TABS: { id: DetailTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'structure', label: 'Structure', icon: GitBranch },
  { id: 'records', label: 'Records', icon: FileText },
  { id: 'giving', label: 'Giving', icon: Coins },
  { id: 'activity', label: 'Activity', icon: Activity },
]

interface MemberDetailSheetProps {
  member: StructureMemberRow
  tree: StructureTree
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (member: StructureMemberRow) => void
}

export function MemberDetailSheet({
  member,
  tree,
  open,
  onOpenChange,
  onEdit,
}: MemberDetailSheetProps) {
  const [tab, setTab] = useState<DetailTab>('overview')

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={member.member}
      description={member.role}
      className="max-w-xl"
    >
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RoleBadge role={member.role} position={member.position} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onEdit(member)
            }}
          >
            <Pencil className="size-3.5" />
            Edit profile
          </Button>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1 pb-px">
          {DETAIL_TABS.map((item) => {
            const active = tab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {tab === 'overview' && <OverviewTab member={member} />}
        {tab === 'structure' && <StructureTab member={member} churchName={tree.churchName} />}
        {tab === 'records' && (
          <ComingSoonTab
            icon={FileText}
            title="Records"
            description="Attendance sheets, follow-ups, and pastoral notes will live here."
          />
        )}
        {tab === 'giving' && (
          <ComingSoonTab
            icon={Coins}
            title="Giving"
            description="Tithes, offerings, and pledge history will connect to KairosPayHub payments."
          />
        )}
        {tab === 'activity' && (
          <ComingSoonTab
            icon={Activity}
            title="Activity"
            description="Recent profile edits, placement moves, and login events will show up here."
          />
        )}
      </div>
    </SideSheet>
  )
}

function OverviewTab({ member }: { member: StructureMemberRow }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle>Contact</SectionTitle>
        <DetailGrid>
          <DetailItem label="Phone" value={member.phone} />
          <DetailItem label="Email" value={member.email} />
        </DetailGrid>
      </section>

      <section className="space-y-3">
        <SectionTitle>Personal</SectionTitle>
        <DetailGrid>
          <DetailItem label="Date of birth" value={member.dateOfBirth || '—'} />
          <DetailItem label="Age" value={member.age || '—'} />
          <DetailItem label="Residence" value={member.residence} wide />
        </DetailGrid>
      </section>

      <section className="space-y-3">
        <SectionTitle>Work & study</SectionTitle>
        <DetailGrid>
          <DetailItem
            label="Occupation"
            value={formatOccupationStatus(member.occupationStatus)}
          />
          <DetailItem label="School / workplace" value={member.schoolOrWorkplace} wide />
        </DetailGrid>
      </section>
    </div>
  )
}

function StructureTab({
  member,
  churchName,
}: {
  member: StructureMemberRow
  churchName: string
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <SectionTitle>Placement chain</SectionTitle>
        <StructureChain
          animated={false}
          size="sm"
          items={[
            { label: churchName, tone: 'church' },
            ...member.structure.map((segment) => ({
              id: segment.layerId,
              label: segment.nodeName,
              tone: 'layer' as const,
            })),
          ]}
        />
      </section>

      <section className="space-y-3">
        <SectionTitle>Units</SectionTitle>
        <div className="space-y-2">
          {member.structure.map((segment) => (
            <div
              key={segment.layerId}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2.5"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {segment.layerName}
              </span>
              <StructureSegmentBadge segment={segment} />
            </div>
          ))}
        </div>
      </section>

      <DetailItem label="Full path" value={member.path} wide />
    </div>
  )
}

function ComingSoonTab({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
      <Icon className="size-8 text-muted-foreground/70" />
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <span className="mt-4 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        Coming soon
      </span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
}

function DetailItem({
  label,
  value,
  wide,
}: {
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-background px-3 py-2.5',
        wide && 'sm:col-span-2',
      )}
    >
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value?.trim() ? value : '—'}</dd>
    </div>
  )
}
