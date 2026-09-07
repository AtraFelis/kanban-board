import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WidgetSettings } from "@/lib/widgetSettings";

interface WidgetSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: WidgetSettings;
  onChange: (patch: Partial<WidgetSettings>) => void;
}

// 위젯 모양 설정: 불투명도 + 배경/카드/글자 색. 변경 즉시 반영된다.
export function WidgetSettingsDialog({
  open,
  onClose,
  settings,
  onChange,
}: WidgetSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>위젯 설정</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 text-sm">
          <label className="grid gap-1">
            <span className="font-medium">
              불투명도 {Math.round(settings.opacity * 100)}%
            </span>
            <input
              type="range"
              min={30}
              max={100}
              value={Math.round(settings.opacity * 100)}
              onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
            />
          </label>

          <ColorRow
            label="배경색"
            value={settings.bgColor}
            fallback="#1e1e1e"
            onChange={(v) => onChange({ bgColor: v })}
          />
          <ColorRow
            label="카드색"
            value={settings.cardColor}
            fallback="#2a2a2a"
            onChange={(v) => onChange({ cardColor: v })}
          />
          <ColorRow
            label="글자색"
            value={settings.textColor}
            fallback="#f5f5f5"
            onChange={(v) => onChange({ textColor: v })}
          />

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorRow({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | null;
  fallback: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 rounded border bg-transparent"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={value === null}
          onClick={() => onChange(null)}
        >
          테마 기본
        </Button>
      </div>
    </div>
  );
}
