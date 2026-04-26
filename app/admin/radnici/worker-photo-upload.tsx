"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateWorkerPhotoAction } from "./actions";
import { createClient } from "@/lib/supabase/client";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;

type WorkerPhotoUploadProps = {
  initialPhotoUrl: string | null;
  providerId: string;
  workerId: string;
  workerName: string;
};

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function WorkerPhotoUpload({
  initialPhotoUrl,
  providerId,
  workerId,
  workerName,
}: WorkerPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function uploadPhoto(file: File) {
    setMessage("");

    if (!acceptedTypes.includes(file.type)) {
      setMessage("Podrzane su JPG, PNG i WEBP slike.");
      return;
    }

    if (file.size > maxFileSize) {
      setMessage("Slika moze biti najvise 5 MB.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const extension = getFileExtension(file);
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const path = `providers/${providerId}/workers/${workerId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("provider-assets")
          .upload(path, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setMessage("Upload nije uspeo. Proveri sliku i probaj ponovo.");
          return;
        }

        const result = await updateWorkerPhotoAction(workerId, path);
        setPhotoUrl(result.photoUrl);
        setMessage("Fotografija je sacuvana.");
        router.refresh();
      } catch {
        setMessage("Fotografija nije sacuvana. Pokusaj ponovo.");
      } finally {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    });
  }

  function removePhoto() {
    setMessage("");

    startTransition(async () => {
      try {
        const result = await updateWorkerPhotoAction(workerId, null);
        setPhotoUrl(result.photoUrl);
        setMessage("Fotografija je uklonjena.");
        router.refresh();
      } catch {
        setMessage("Fotografija nije uklonjena. Pokusaj ponovo.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={workerName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-3 text-center text-sm text-muted-foreground">
              Nema slike
            </span>
          )}
        </div>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                uploadPhoto(file);
              }
            }}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="flex flex-wrap gap-2">
            {photoUrl ? (
              <button
                type="button"
                disabled={isPending}
                onClick={removePhoto}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ukloni fotografiju
              </button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            JPG, PNG ili WEBP, najvise 5 MB.
          </p>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {isPending ? "Cuvanje..." : message}
        </p>
      ) : null}
    </div>
  );
}
