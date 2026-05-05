"use client";

import { useId, useState } from "react";

type TimeInputProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

type PartialTimeValue = {
  hour: string;
  minute: string;
};

const HOURS = Array.from({ length: 24 }, (_, hour) =>
  hour.toString().padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, minute) =>
  minute.toString().padStart(2, "0"),
);

function normalizeTimeValue(value: string) {
  if (!value) {
    return "";
  }

  const [hour = "", minute = ""] = value.split(":");

  if (!HOURS.includes(hour) || !MINUTES.includes(minute)) {
    return "";
  }

  return `${hour}:${minute}`;
}

function splitTimeValue(value: string) {
  const normalizedValue = normalizeTimeValue(value);

  if (!normalizedValue) {
    return {
      hour: "",
      minute: "",
    };
  }

  const [hour, minute] = normalizedValue.split(":");

  return { hour, minute };
}

export function TimeInput({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
}: TimeInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isControlled = value !== undefined;
  const normalizedControlledValue = normalizeTimeValue(value ?? "");
  const [internalParts, setInternalParts] = useState<PartialTimeValue>(() =>
    splitTimeValue(defaultValue),
  );
  const [draftParts, setDraftParts] = useState<PartialTimeValue | null>(null);
  const controlledParts = splitTimeValue(normalizedControlledValue);
  const currentParts = isControlled
    ? draftParts ?? controlledParts
    : internalParts;
  const currentValue =
    currentParts.hour && currentParts.minute
      ? `${currentParts.hour}:${currentParts.minute}`
      : "";

  function updateValue(nextParts: PartialTimeValue) {
    if (!isControlled) {
      setInternalParts(nextParts);
    } else {
      setDraftParts(nextParts);
    }

    const nextValue =
      nextParts.hour && nextParts.minute
        ? `${nextParts.hour}:${nextParts.minute}`
        : "";

    if (isControlled && nextValue) {
      setDraftParts(null);
    }

    onValueChange?.(nextValue);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <select
          id={inputId}
          value={currentParts.hour}
          onChange={(event) =>
            updateValue({
              ...currentParts,
              hour: event.target.value,
            })
          }
          required={required}
          disabled={disabled}
          aria-label={ariaLabel ? `${ariaLabel} sat` : undefined}
          className={className}
        >
          <option value="">HH</option>
          {HOURS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <span className="text-sm font-medium text-muted-foreground">:</span>

        <select
          value={currentParts.minute}
          onChange={(event) =>
            updateValue({
              ...currentParts,
              minute: event.target.value,
            })
          }
          required={required}
          disabled={disabled}
          aria-label={ariaLabel ? `${ariaLabel} minut` : undefined}
          className={className}
        >
          <option value="">mm</option>
          {MINUTES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
