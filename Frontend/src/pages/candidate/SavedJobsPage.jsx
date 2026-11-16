import { useEffect } from "react";
import { Alert, Button, Card, Empty, Pagination, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import JobCard from "../../components/JobCard";
import SaveJobButton from "../../components/SaveJobButton";
import usePaginatedList from "../../hooks/usePaginatedList";
import { listSavedJobs } from "../../services/candidateService";

export default function SavedJobsPage() {
  const list = usePaginatedList(listSavedJobs, { page: 1, limit: 10 });
  useEffect(() => { document.title = "Việc đã lưu | Smart Recruitment"; }, []);

  function handleRemoved(jobId, isSaved) {
    if (isSaved) return;
    list.setRows((rows) => rows.filter((row) => String(row.job_id) !== String(jobId)));
    list.reload();
  }

  return (
    <section>
      <div className="page-heading page-heading-with-actions">
        <div><h1>Việc đã lưu</h1><p>Các vị trí bạn muốn theo dõi và xem lại.</p></div>
        <Button icon={<ReloadOutlined />} disabled={list.loading} onClick={list.reload}>Tải lại</Button>
      </div>
      {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error} action={<Button onClick={list.reload}>Thử lại</Button>} />}
      <Spin spinning={list.loading}>
        <div className="job-cards">
          {list.rows.map((saved) => saved.job ? (
            <JobCard key={saved.job_id} job={saved.job} available={saved.job.is_available === true} savedAt={saved.created_at}
              from="/candidate/saved-jobs" disabled={list.loading} onSavedChange={(isSaved) => handleRemoved(saved.job_id, isSaved)} />
          ) : <Card key={saved.job_id}><p>Tin tuyển dụng không còn tồn tại.</p>
            <SaveJobButton jobId={saved.job_id} saved onChange={(isSaved) => handleRemoved(saved.job_id, isSaved)} disabled={list.loading} />
          </Card>)}
          {!list.loading && !list.rows.length && !list.error && <Card><Empty description="Bạn chưa lưu việc làm nào.">
            <Link to="/candidate/jobs"><Button type="primary">Tìm việc</Button></Link>
          </Empty></Card>}
        </div>
      </Spin>
      {list.total > 0 && <Pagination className="job-pagination" current={list.query.page} pageSize={list.query.limit} total={list.total}
        showSizeChanger pageSizeOptions={[10, 20, 50, 100]} disabled={list.loading}
        onChange={(page, limit) => list.setQuery((current) => ({ ...current, page, limit }))} />}
    </section>
  );
}
