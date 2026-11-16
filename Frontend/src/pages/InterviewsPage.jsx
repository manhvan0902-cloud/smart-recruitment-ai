import { useEffect } from "react";
import { Alert, Button } from "antd";
import { Link, useSearchParams } from "react-router-dom";
import InterviewsPanel from "../components/InterviewsPanel";

export default function InterviewsPage({ recruiter = false }) {
  const [search, setSearch] = useSearchParams();
  const requestedId = search.get("applicationId") || "";
  const applicationId = /^[1-9]\d*$/.test(requestedId) && Number.isSafeInteger(Number(requestedId)) ? requestedId : "";
  const prefix = recruiter ? "/recruiter" : "/candidate";
  useEffect(() => { document.title = "Lịch phỏng vấn | Smart Recruitment"; }, []);
  return <section>
    <div className="page-heading page-heading-with-actions"><div><h1>Lịch phỏng vấn</h1>
      <p>{recruiter ? "Theo dõi phản hồi, điều chỉnh và hoàn tất các buổi phỏng vấn của công ty." : "Xem lời mời và phản hồi lịch phỏng vấn của bạn."}</p></div>
      {recruiter && <Link to="/recruiter/applications"><Button>Chọn hồ sơ để tạo lịch</Button></Link>}</div>
    {applicationId && <Alert className="form-alert" type="info" showIcon title="Đang lọc lịch theo đơn ứng tuyển"
      description={<Link to={prefix + "/applications/" + applicationId}>Xem đơn ứng tuyển</Link>}
      action={<Button onClick={() => setSearch({}, { replace: true })}>Xem tất cả lịch</Button>} />}
    <InterviewsPanel key={`${prefix}:${applicationId}`} recruiter={recruiter} applicationId={applicationId} />
  </section>;
}
