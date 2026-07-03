/** Fetch export artifact and trigger a browser download with the given filename. */
export async function downloadExportJob(jobId: string, fileName?: string | null): Promise<void> {
  const res = await fetch(`/api/exports/${jobId}/download`);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName?.trim() || `export-${jobId}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
