import { useEffect, useRef, useState } from "react";
import { App, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { getWebsiteUrl } from "../utils/format";

export default function CvDownloadButton({ load, disabled = false }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);

  async function download() {
    if (operation.current || disabled) return;
    const controller = new AbortController();
    operation.current = controller;
    setLoading(true);
    try {
      const result = await load(controller.signal);
      if (controller.signal.aborted) return;
      const url = getWebsiteUrl(result.data.downloadUrl);
      if (!url) throw new Error("Đường dẫn tải CV không hợp lệ.");
      window.location.assign(url);
    } catch (error) {
      if (!controller.signal.aborted) message.error(error.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return <Button icon={<DownloadOutlined />} loading={loading} disabled={disabled} onClick={download}>Tải CV</Button>;
}
