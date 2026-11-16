import { useEffect } from "react";
import { Alert, Button, Card, Empty, Select, Table } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import StatusTag from "../components/StatusTag";
import { applicationStatuses } from "../config/applications";
import usePaginatedList from "../hooks/usePaginatedList";
import { listCandidateApplications } from "../services/candidateService";
import { listRecruiterApplications } from "../services/recruiterService";
import { formatDateTime } from "../utils/format";

export default function ApplicationsPage({ recruiter = false }) {
  const [search, setSearch] = useSearchParams();
  const requestedJob = search.get("jobId") || "";
  const jobId = /^[1-9]\d*$/.test(requestedJob) && Number.isSafeInteger(Number(requestedJob)) ? requestedJob : "";
  const list = usePaginatedList(recruiter ? listRecruiterApplications : listCandidateApplications,
    recruiter ? { page: 1, limit: 10, status: "", jobId } : { page: 1, limit: 10 });
  const prefix = recruiter ? "/recruiter" : "/candidate";
  useEffect(() => { document.title = "Đơn ứng tuyển | Smart Recruitment"; }, []);
  useEffect(() => {
    if (!recruiter) return;
    list.setQuery((current) => current.jobId === jobId ? current : { ...current, jobId, page: 1 });
  }, [recruiter, jobId, list.setQuery]);

  const columns = [];
  if (recruiter) columns.push({ title: "Ứng viên", key: "candidate", width: 260, render: (_, application) => (
    <div className="table-identity"><Link className="table-title-link" to={prefix + "/applications/" + application.id}>{application.candidate?.full_name || "Ứng viên"}</Link>
      <span className="table-secondary">{application.candidate?.email || "—"}</span></div>
  ) });
  columns.push(
    { title: "Vị trí ứng tuyển", key: "job", width: 280, render: (_, application) => <div className="table-identity"><span>{application.job?.title || "Tin tuyển dụng"}</span>
      {!recruiter && <span className="table-secondary">{application.job?.company?.name || "—"}</span>}</div> },
    { title: "Trạng thái", dataIndex: "status", width: 180, render: (status) => <StatusTag status={status} /> },
    { title: "Ngày nộp", dataIndex: "submitted_at", width: 190, render: formatDateTime },
    { title: "Thao tác", key: "actions", width: 130, render: (_, application) => <Link to={prefix + "/applications/" + application.id}><Button>Chi tiết</Button></Link> },
  );

  return <section>
    <div className="page-heading page-heading-with-actions"><div><h1>Đơn ứng tuyển</h1><p>{recruiter ? "Hồ sơ ứng viên đã gửi đến các vị trí của công ty." : "Theo dõi trạng thái và xem lại hồ sơ bạn đã gửi."}</p></div>
      <Button icon={<ReloadOutlined />} disabled={list.loading} onClick={list.reload}>Tải lại</Button></div>
    {recruiter && list.query.jobId && <Alert className="form-alert" type="info" showIcon title="Đang xem đơn ứng tuyển của tin đã chọn"
      description={<Link to={"/recruiter/jobs/" + list.query.jobId}>Xem tin tuyển dụng</Link>}
      action={<Button onClick={() => { list.setQuery((current) => ({ ...current, jobId: "", page: 1 })); setSearch({}, { replace: true }); }}>Xem tất cả tin</Button>} />}
    {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error} action={<Button onClick={list.reload}>Thử lại</Button>} />}
    <Card className="data-table-card">
      {recruiter && <div className="table-toolbar"><div className="filter-field"><label htmlFor="application-status">Trạng thái đơn</label>
        <Select id="application-status" value={list.query.status} options={[{ value: "", label: "Tất cả trạng thái" }, ...applicationStatuses]}
          onChange={(status) => list.setQuery((current) => ({ ...current, status, page: 1 }))} /></div></div>}
      <Table rowKey={(application) => String(application.id)} columns={columns} dataSource={list.rows} loading={list.loading} scroll={{ x: recruiter ? 1040 : 780 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={list.error ? "Chưa tải được đơn ứng tuyển." : "Chưa có đơn ứng tuyển trong danh sách."} /> }}
        pagination={{ current: list.query.page, pageSize: list.query.limit, total: list.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100] }}
        onChange={(pagination) => list.setQuery((current) => ({ ...current, page: pagination.current, limit: pagination.pageSize }))} />
    </Card>
  </section>;
}
