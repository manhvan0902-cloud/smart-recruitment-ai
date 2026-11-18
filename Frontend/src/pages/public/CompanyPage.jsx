import { useEffect, useState } from "react";
import { Alert, Avatar, Button, Card, Descriptions, Empty, Pagination, Result, Skeleton, Tag } from "antd";
import { ArrowLeftOutlined, BankOutlined } from "@ant-design/icons";
import { Link, useParams, useSearchParams } from "react-router-dom";
import JobCard from "../../components/JobCard";
import { getPublicCompany, listPublicCompanyJobs } from "../../services/publicService";
import { getWebsiteUrl } from "../../utils/format";
import { getJobSearchQuery } from "../../utils/jobs";

export default function CompanyPage() {
  const { companyId } = useParams();
  const [search, setSearch] = useSearchParams();
  const { page, limit } = getJobSearchQuery(search);
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setCompany(null);
    setJobs([]);
    setTotal(0);
    document.title = "Thông tin công ty | Smart Recruitment";
    Promise.all([
      getPublicCompany(companyId, controller.signal),
      listPublicCompanyJobs(companyId, { page, limit }, controller.signal),
    ])
      .then(([profile, result]) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.pagination.total / limit));
        if (page > lastPage) {
          setSearch({ page: String(lastPage), limit: String(limit) }, { replace: true });
          return;
        }
        setCompany(profile.data);
        setJobs(result.data);
        setTotal(result.pagination.total);
        document.title = profile.data.name + " | Smart Recruitment";
      })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, page, limit, refreshCount, setSearch]);

  if (loading) return <Card><Skeleton active avatar paragraph={{ rows: 8 }} /></Card>;
  if (error?.status === 404) return <Result status="warning" title="Hồ sơ công ty hiện không khả dụng"
    subTitle="Bạn có thể tiếp tục tìm kiếm các việc làm đang tuyển."
    extra={<Link to="/jobs"><Button type="primary">Tìm việc làm</Button></Link>} />;
  if (error) return <Alert type="error" showIcon role="alert" title={error.message}
    action={<Button onClick={() => setRefreshCount((value) => value + 1)}>Thử lại</Button>} />;
  if (!company) return null;

  const website = getWebsiteUrl(company.website);
  const from = "/companies/" + companyId + "?" + new URLSearchParams({ page: String(page), limit: String(limit) }).toString();

  return (
    <section>
      <Link className="back-link" to="/jobs"><ArrowLeftOutlined /> Tìm việc làm</Link>
      <Card className="public-company-header">
        <div className="public-company-identity">
          <Avatar shape="square" size={88} src={company.logo?.url} icon={<BankOutlined />} />
          <div><h1>{company.name}</h1><Tag color="green">Công ty đã xác minh</Tag></div>
        </div>
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: "industry", label: "Ngành nghề", children: company.industry?.name || "Chưa cập nhật" },
          { key: "size", label: "Quy mô", children: company.company_size || "Chưa cập nhật" },
          { key: "location", label: "Địa điểm", children: company.location?.name || "Chưa cập nhật" },
          { key: "address", label: "Địa chỉ", children: company.address || "Chưa cập nhật" },
          { key: "website", label: "Website", children: website ? <a href={website} target="_blank" rel="noopener noreferrer">{website}</a> : "Chưa cập nhật" },
        ]} />
      </Card>
      <Card className="public-company-about" title="Giới thiệu công ty"><p className="preserve-text job-body-text">{company.description || "Công ty chưa bổ sung thông tin giới thiệu."}</p></Card>
      <div className="public-section-heading"><h2>Việc làm đang tuyển</h2><span>{total} vị trí</span></div>
      <div className="job-cards">
        {jobs.map((job) => <JobCard key={job.id} job={job} publicView from={from} />)}
        {!jobs.length && <Card><Empty description="Công ty hiện chưa có tin đang nhận hồ sơ." /></Card>}
      </div>
      {total > 0 && <Pagination className="job-pagination" current={page} pageSize={limit} total={total}
        showSizeChanger pageSizeOptions={[10, 20, 50, 100]}
        onChange={(nextPage, nextLimit) => setSearch({ page: String(nextPage), limit: String(nextLimit) })} />}
    </section>
  );
}
