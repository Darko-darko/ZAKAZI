"use client";

import { useRef } from "react";

const MANUAL_ADD_ID = "rucno-dodaj-termin";

type Option = {
  id: string;
  name: string;
};

type ManualBookingFiltersProps = {
  currentDate: string;
  currentWorker: string;
  currentStatus: string;
  manualDate: string;
  manualWorker: string;
  manualService: string;
  services: Option[];
  workers: Option[];
};

export function ManualBookingFilters({
  currentDate,
  currentWorker,
  currentStatus,
  manualDate,
  manualWorker,
  manualService,
  services,
  workers,
}: ManualBookingFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const serviceRef = useRef<HTMLSelectElement>(null);

  function submitWithResetService() {
    if (serviceRef.current) {
      serviceRef.current.value = "";
    }

    formRef.current?.requestSubmit();
  }

  function submitCurrentForm() {
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={`/admin/termini#${MANUAL_ADD_ID}`}
      className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-background p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <input type="hidden" name="date" value={currentDate} />
      <input type="hidden" name="worker" value={currentWorker} />
      <input type="hidden" name="status" value={currentStatus} />
      <input type="hidden" name="manual" value="1" />
      <label className="space-y-2">
        <span className="text-sm font-medium text-foreground">Datum</span>
        <input
          type="date"
          name="manual_date"
          defaultValue={manualDate}
          onChange={submitWithResetService}
          className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-foreground">Radnik</span>
        <select
          name="manual_worker"
          defaultValue={manualWorker}
          onChange={submitWithResetService}
          className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Izaberi radnika</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-foreground">Usluga</span>
        <select
          ref={serviceRef}
          name="manual_service"
          defaultValue={manualService}
          onChange={submitCurrentForm}
          className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option value="">
            {manualWorker ? "Izaberi uslugu" : "Prvo izaberi radnika"}
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>
      <button className="btn-secondary min-h-11 self-end rounded-md px-4 text-sm font-semibold text-foreground">
        Prikaži slobodne termine
      </button>
    </form>
  );
}
