import type { Mission } from '../types'
import { missionTypeColor, priorityColor } from '../lib/utils'
import GlassPanel from './ui/GlassPanel'
import ProgressBar from './ui/ProgressBar'
import Icon from './ui/Icon'

interface MissionCardProps {
  mission: Mission
}

const statusIcon: Record<Mission['status'], string> = {
  active: 'play_circle',
  completed: 'check_circle',
  pending: 'schedule',
  failed: 'cancel',
}

export default function MissionCard({ mission }: MissionCardProps) {
  const typeColor = missionTypeColor[mission.type] ?? '#ccc3d8'
  const priColor = priorityColor[mission.priority] ?? '#94A3B8'

  return (
    <GlassPanel hover className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-label font-bold uppercase tracking-wider"
              style={{ color: typeColor }}
            >
              {mission.type}
            </span>
            <span className="text-on-surface-variant/30">•</span>
            <span className="text-[10px] font-label text-on-surface-variant/60 uppercase tracking-wider">
              {mission.id}
            </span>
          </div>
          <h3 className="font-headline font-bold text-white tracking-tight text-sm truncate">
            {mission.name}
          </h3>
        </div>
        <span
          className="px-2 py-0.5 rounded text-[9px] font-label font-bold uppercase tracking-wider border"
          style={{
            color: priColor,
            borderColor: `${priColor}30`,
            backgroundColor: `${priColor}10`,
          }}
        >
          {mission.priority}
        </span>
      </div>

      <p className="text-xs text-on-surface-variant/70 line-clamp-2 leading-relaxed">
        {mission.description}
      </p>

      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <Icon name={statusIcon[mission.status]} size="sm" style={{ color: typeColor }} className="" />
        <div className="flex-1">
          <ProgressBar value={mission.progress} color={typeColor} showLabel />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-on-surface-variant/60 font-label uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Icon name="smart_toy" size="sm" className="text-on-surface-variant/40" />
          <span>{mission.assignedAgent}</span>
        </div>
        <span>{mission.startedAt}</span>
      </div>
    </GlassPanel>
  )
}
