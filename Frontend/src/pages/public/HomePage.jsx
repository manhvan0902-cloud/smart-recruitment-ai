import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Input, Skeleton } from "antd";
import { ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import JobCard from "../../components/JobCard";
import usePaginatedList from "../../hooks/usePaginatedList";
import { listPublicJobs } from "../../services/publicService";
import { useAuth } from "../../contexts/AuthContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const showEmployerIntro = !user || user.role === "COMPANY";
  const [keyword, setKeyword] = useState("");
  const jobs = usePaginatedList(listPublicJobs, { page: 1, limit: 6 });

  useEffect(() => { document.title = "Tìm việc làm | Smart Recruitment"; }, []);

  function searchJobs(value) {
    const query = new URLSearchParams();
    if (value.trim()) query.set("q", value.trim());
    navigate({ pathname: "/jobs", search: query.toString() });
  }

  return (
    <>
      <section className={showEmployerIntro ? "public-hero" : "public-hero public-hero-single"}>
        <div className="public-hero-copy">
          <h1>Tìm công việc phù hợp với bạn</h1>
          <p>Khám phá các vị trí đang tuyển và tìm hiểu công ty trước khi ứng tuyển.</p>
          <div className="public-hero-search">
            <label htmlFor="home-job-search">Vị trí hoặc kỹ năng bạn quan tâm</label>
            <Input.Search id="home-job-search" size="large" maxLength={120} value={keyword} allowClear
              placeholder="Tên vị trí, mô tả hoặc yêu cầu công việc" prefix={<SearchOutlined />}
              enterButton="Tìm việc" onChange={(event) => setKeyword(event.target.value)} onSearch={searchJobs} />
          </div>
          <Link className="public-browse-link" to="/jobs">Xem tất cả việc làm <ArrowRightOutlined /></Link>
        </div>
        {showEmployerIntro && <aside className="public-employer-intro">
          <h2>Bạn đang tìm nhân sự?</h2>
          <p>Đăng tin, tiếp nhận hồ sơ và quản lý phỏng vấn trong cùng một hệ thống.</p>
          <Link to={user ? "/recruiter/jobs/new" : "/register"} state={{ registrationRole: "COMPANY" }}>
            <Button size="large">{user ? "Tạo tin tuyển dụng" : "Đăng ký nhà tuyển dụng"}</Button>
          </Link>
        </aside>}
      </section>
      <section className="public-latest-jobs">
        <div className="public-section-heading"><h2>Việc làm mới nhất</h2><Link to="/jobs">Xem tất cả <ArrowRightOutlined /></Link></div>
        {jobs.error && <Alert className="form-alert" type="error" showIcon title={jobs.error}
          action={<Button onClick={jobs.reload}>Thử lại</Button>} />}
        <div className="public-home-jobs">
          {jobs.loading ? Array.from({ length: 3 }, (_, index) => <Card key={index}><Skeleton active paragraph={{ rows: 3 }} /></Card>)
            : jobs.rows.map((job) => <JobCard key={job.id} job={job} publicView from="/jobs" />)}
        </div>
        {!jobs.loading && !jobs.error && !jobs.rows.length && <Card><Empty description="Hiện chưa có tin tuyển dụng đang nhận hồ sơ." /></Card>}
      </section>
    </>
  );
}
