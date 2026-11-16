import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Empty, Pagination, Radio, Result, Skeleton } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link, useParams, useSearchParams } from "react-router-dom";
import CvMatchResultCard from "../../components/CvMatchResultCard";
import MatchJobsPicker from "../../components/MatchJobsPicker";
import StatusTag from "../../components/StatusTag";
import usePaginatedList from "../../hooks/usePaginatedList";
import { createCandidateCvMatches, getCandidateCv, getCandidateJob, listCandidateCvMatches } from "../../services/candidateService";

export default function CvMatchesPage() {
  const { cvId } = useParams();
  const [search] = useSearchParams();
  const requestedJob = search.get("jobId") || "";
  const jobId = /^[1-9]\d*$/.test(requestedJob) && Number.isSafeInteger(Number(requestedJob)) ? requestedJob : "";
  return <CvMatches key={`${cvId}:${jobId}`} cvId={cvId} jobId={jobId} />;
}

function CvMatches({ cvId, jobId }) {
  const { message } = App.useApp();
  const [cv, setCv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cvError, setCvError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [mode, setMode] = useState("selected");
  const [jobLoading, setJobLoading] = useState(Boolean(jobId));
  const [jobError, setJobError] = useState("");
  const [jobRefresh, setJobRefresh] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const operation = useRef(null);
  const hasLoaded = useRef(false);
  const load = useCallback((query, signal) => listCandidateCvMatches(cvId, query, signal), [cvId]);
  const list = usePaginatedList(load, { page: 1, limit: 10 });
  const ready = cv?.processing_status === "READY" && !cv?.archived_at;
  const locked = saving || refreshing || Boolean(cvError);
  useEffect(() => () => operation.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(!hasLoaded.current);
    setRefreshing(true);
    setCvError(null);
    document.title = "Đối chiếu kỹ năng CV | Smart Recruitment";
    getCandidateCv(cvId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setCv(result.data); hasLoaded.current = true; } })
      .catch((requestError) => { if (!controller.signal.aborted) setCvError(requestError); })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } });
    return () => controller.abort();
  }, [cvId, refreshCount]);

  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    setJobLoading(true);
    setJobError("");
    getCandidateJob(jobId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSelectedJobs((current) => current.some((job) => String(job.id) === String(jobId)) ? current : [...current, result.data].slice(0, 20)); })
      .catch((requestError) => { if (!controller.signal.aborted) setJobError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setJobLoading(false); });
    return () => controller.abort();
  }, [jobId, jobRefresh]);

  async function match() {
    if (operation.current || locked || !ready || jobLoading || (mode === "selected" && !selectedJobs.length)) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError(null);
    setLastRun(null);
    try {
      const result = await createCandidateCvMatches(cvId, mode === "selected" ? { jobIds: selectedJobs.map((job) => Number(job.id)) } : {}, controller.signal);
      if (controller.signal.aborted) return;
      setLastRun(result.data.length);
      list.setQuery((current) => ({ ...current, page: 1 }));
      setRefreshCount((value) => value + 1);
      if (result.data.length) message.success(`Đã tạo ${result.data.length} kết quả đối chiếu kỹ năng.`);
      else message.info("Chưa có tin đủ điều kiện để đối chiếu.");
    } catch (requestError) {
      if (!controller.signal.aborted) { setError(requestError); list.reload(); setRefreshCount((value) => value + 1); }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  if (loading) return <Card><Skeleton active paragraph={{ rows: 7 }} /></Card>;
  if (cvError?.status === 404) return <Result status="404" title="Không tìm thấy CV" extra={<Link to="/candidate/cvs"><Button>Về CV của tôi</Button></Link>} />;
  if (!cv && cvError) return <Alert type="error" showIcon role="alert" title={cvError.message} action={<Button onClick={() => setRefreshCount((value) => value + 1)}>Thử lại</Button>} />;
  if (!cv) return null;

  return <section>
    <Link className="back-link" to={"/candidate/cvs/" + cvId}><ArrowLeftOutlined /> Chi tiết CV</Link>
    <div className="page-heading page-heading-with-actions"><div><h1>Đối chiếu kỹ năng CV</h1><p>{cv.name} · Văn bản phiên bản {cv.extraction_version || 0}</p><StatusTag status={cv.processing_status} /></div>
      <Button icon={<ReloadOutlined />} loading={refreshing} disabled={saving || refreshing} onClick={() => { setRefreshCount((value) => value + 1); list.reload(); }}>Tải lại dữ liệu</Button></div>
    <Alert className="form-alert" type="info" showIcon title="Kết quả tham khảo từ kỹ năng xuất hiện trong văn bản CV."
      description="Phương pháp skill-overlap-v1 chưa dùng mô hình AI và chưa suy luận kinh nghiệm. Khi chưa đủ dữ liệu, điểm tổng được để trống." />
    {cvError && <Alert className="form-alert" type="error" showIcon role="alert" title={cvError.message} />}
    {!ready && <Alert className="form-alert" type="warning" showIcon title={cv.archived_at ? "CV đã lưu trữ. Bạn có thể xem kết quả cũ; hãy chọn CV đang hoạt động để đối chiếu mới." : "CV cần trích xuất văn bản thành công trước khi đối chiếu."}
      description={<Link to={"/candidate/cvs/" + cvId}>Xem trạng thái và trích xuất CV</Link>} />}
    {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error.message}
      description="Hãy kiểm tra lịch sử kết quả bên dưới trước khi gửi lại. Một số tin có thể đã được xử lý trước khi yêu cầu gặp lỗi." />}
    {ready && <Card title="Tạo kết quả đối chiếu" className="match-create-card">
      <Radio.Group value={mode} disabled={locked} onChange={(event) => setMode(event.target.value)} options={[{ value: "selected", label: "Chọn tin tuyển dụng" }, { value: "recent", label: "Tối đa 20 tin mới nhất" }]} />
      {mode === "recent" ? <p className="section-help">Đối chiếu với tối đa 20 tin mới nhất đang nhận hồ sơ. Đây là nhóm tin theo thời gian đăng; kết quả không được xếp hạng trên toàn bộ hệ thống.</p>
        : <>
          {jobLoading && <p role="status">Đang tải tin đã chọn…</p>}
          {jobError && <Alert className="form-alert" type="warning" showIcon title={jobError} description="Bạn có thể chọn tin khác đang nhận hồ sơ."
            action={<Button disabled={locked} onClick={() => setJobRefresh((value) => value + 1)}>Tải lại tin</Button>} />}
          <MatchJobsPicker selectedJobs={selectedJobs} onChange={setSelectedJobs} disabled={locked || jobLoading} />
        </>}
      <Button type="primary" loading={saving} disabled={locked || jobLoading || (mode === "selected" && !selectedJobs.length)} onClick={match}>Đối chiếu kỹ năng</Button>
    </Card>}
    {lastRun !== null && <Alert className="form-alert" type={lastRun ? "success" : "info"} showIcon title={lastRun ? `Đã lưu ${lastRun} kết quả đối chiếu. Kết quả mới nằm đầu lịch sử.` : "Không có tin đủ điều kiện trong lần đối chiếu này."} />}
    <div className="match-history-heading"><h2>Lịch sử kết quả</h2><Button disabled={saving || list.loading} onClick={list.reload}>Tải lại kết quả</Button></div>
    {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error} action={<Button disabled={saving} onClick={list.reload}>Thử lại</Button>} />}
    {list.loading ? <Card><Skeleton active paragraph={{ rows: 5 }} /></Card> : !list.rows.length ? <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={list.error ? "Chưa tải được kết quả đối chiếu." : "CV chưa có kết quả đối chiếu."} /></Card>
      : <div className="match-results-list">{list.rows.map((result) => <CvMatchResultCard key={result.id} result={result} cv={cv} />)}</div>}
    {list.total > 0 && <div className="list-pagination"><Pagination current={list.query.page} pageSize={list.query.limit} total={list.total} disabled={saving || list.loading}
      showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `${total} kết quả`}
      onChange={(page, limit) => list.setQuery((current) => ({ ...current, page, limit }))} /></div>}
  </section>;
}
