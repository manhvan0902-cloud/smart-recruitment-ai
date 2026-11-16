import { useEffect, useRef, useState } from "react";
import { App, Button } from "antd";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import { removeCandidateSavedJob, saveCandidateJob } from "../services/candidateService";

export default function SaveJobButton({ jobId, saved = false, disabled = false, onChange }) {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const operation = useRef(null);

  useEffect(() => () => operation.current?.abort(), [jobId]);

  async function toggleSaved() {
    if (operation.current || disabled) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    const next = !saved;
    try {
      if (next) await saveCandidateJob(jobId, controller.signal);
      else await removeCandidateSavedJob(jobId, controller.signal);
      if (controller.signal.aborted) return;
      onChange?.(next);
      message.success(next ? "Đã lưu việc làm." : "Đã bỏ lưu việc làm.");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (!next && error.code === "SAVED_JOB_NOT_FOUND") {
        onChange?.(false);
      } else message.error(error.message);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return <Button icon={saved ? <StarFilled /> : <StarOutlined />} onClick={toggleSaved} loading={saving} disabled={disabled}
    aria-label={(saved ? "Bỏ lưu" : "Lưu") + " việc làm"}>{saved ? "Bỏ lưu" : "Lưu việc"}</Button>;
}
