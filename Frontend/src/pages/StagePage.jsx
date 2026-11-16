import { useEffect } from "react";
import { Card, Empty } from "antd";

export default function StagePage({ title }) {
  useEffect(() => {
    document.title = title + " | Smart Recruitment";
  }, [title]);

  return (
    <section>
      <div className="page-heading"><h1>{title}</h1></div>
      <Card className="stage-card">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chức năng này đang được phát triển." />
      </Card>
    </section>
  );
}
