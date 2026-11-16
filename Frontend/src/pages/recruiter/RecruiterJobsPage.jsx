import { useEffect } from "react";
import { Alert, Button, Card, Empty, Select, Space, Table, Tag } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import StatusTag from "../../components/StatusTag";
import usePaginatedList from "../../hooks/usePaginatedList";
import { listRecruiterJobs } from "../../services/recruiterService";
import { formatDateTime } from "../../utils/format";
import { formatSalary, jobStatuses } from "../../utils/jobs";

export default function RecruiterJobsPage() {
  const list = usePaginatedList(listRecruiterJobs, { page: 1, limit: 10, status: "" });
  useEffect(() => { document.title = "Tin tuyển dụng | Smart Recruitment"; }, []);

  const columns = [
    { title: "Vị trí", key: "title", width: 300, render: (_, job) => (
      <div className="table-identity"><Link className="table-title-link" to={"/recruiter/jobs/" + job.id}>{job.title}</Link>
        <span className="table-secondary">{formatSalary(job)}</span></div>
    ) },
    { title: "Trạng thái", key: "status", width: 190, render: (_, job) => (
      <div className="table-identity"><StatusTag status={job.status} />{job.is_hidden && <Tag color="warning">Đang ẩn</Tag>}</div>
    ) },
    { title: "Hạn nộp", dataIndex: "application_deadline", width: 190, render: formatDateTime },
    { title: "Ngày đăng", dataIndex: "published_at", width: 190, render: formatDateTime },
    { title: "Thao tác", key: "action", width: 260, render: (_, job) => <Space wrap>
      <Link to={"/recruiter/jobs/" + job.id}><Button>Chi tiết / Sửa</Button></Link>
      <Link to={"/recruiter/applications?jobId=" + job.id}><Button>Xem đơn</Button></Link>
    </Space> },
  ];

  return (
    <section>
      <div className="page-heading page-heading-with-actions">
        <div><h1>Tin tuyển dụng</h1><p>Quản lý nội dung, kỹ năng yêu cầu và trạng thái các tin của công ty.</p></div>
        <Link to="/recruiter/jobs/new"><Button type="primary" icon={<PlusOutlined />}>Tạo tin</Button></Link>
      </div>
      {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error}
        description={<Link to="/recruiter/profile">Xem hồ sơ công ty</Link>} action={<Button onClick={list.reload}>Thử lại</Button>} />}
      <Card className="data-table-card">
        <div className="table-toolbar">
          <div className="filter-field"><label htmlFor="job-status-filter">Trạng thái tin</label>
            <Select id="job-status-filter" value={list.query.status} options={[{ value: "", label: "Tất cả trạng thái" }, ...jobStatuses]}
              onChange={(status) => list.setQuery((current) => ({ ...current, status, page: 1 }))} />
          </div>
          <Button icon={<ReloadOutlined />} disabled={list.loading} onClick={list.reload}>Tải lại</Button>
        </div>
        <Table rowKey={(job) => String(job.id)} columns={columns} dataSource={list.rows} loading={list.loading} scroll={{ x: 1020 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={list.error ? "Chưa tải được danh sách tin." : "Chưa có tin tuyển dụng trong danh sách này."} /> }}
          pagination={{ current: list.query.page, pageSize: list.query.limit, total: list.total, showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100], showTotal: (total) => `${total} tin tuyển dụng` }}
          onChange={(pagination) => list.setQuery((current) => ({ ...current, page: pagination.current, limit: pagination.pageSize }))} />
      </Card>
    </section>
  );
}
