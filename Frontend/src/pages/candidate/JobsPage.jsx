import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Drawer, Empty, Input, Pagination, Select, Spin } from "antd";
import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import JobCard from "../../components/JobCard";
import usePaginatedList from "../../hooks/usePaginatedList";
import { getCandidateCatalog, listCandidateJobs } from "../../services/candidateService";
import { getPublicCatalog, listPublicJobs } from "../../services/publicService";
import { catalogOptions, getJobSearchQuery, workModeLabels } from "../../utils/jobs";

function JobFilters({ catalog, query, onChange, onReset, prefix }) {
  return (
    <div className="job-filter-fields">
      {[
        ["industryId", "Ngành nghề", catalog.industries],
        ["locationId", "Địa điểm", catalog.locations],
        ["levelId", "Cấp bậc", catalog.jobLevels],
        ["employmentTypeId", "Loại việc làm", catalog.employmentTypes],
      ].map(([name, label, items]) => (
        <div className="filter-field" key={name}>
          <label htmlFor={prefix + name}>{label}</label>
          <Select id={prefix + name} allowClear showSearch optionFilterProp="label" value={query[name] || undefined}
            placeholder="Tất cả" options={catalogOptions(items)} onChange={(value) => onChange(name, value || "")} />
        </div>
      ))}
      <div className="filter-field"><label htmlFor={prefix + "workMode"}>Hình thức làm việc</label>
        <Select id={prefix + "workMode"} allowClear placeholder="Tất cả" value={query.workMode || undefined}
          options={Object.entries(workModeLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => onChange("workMode", value || "")} />
      </div>
      <Button onClick={onReset}>Xóa bộ lọc</Button>
    </div>
  );
}

export default function JobsPage({ publicView = false }) {
  const [search, setSearch] = useSearchParams();
  const list = usePaginatedList(publicView ? listPublicJobs : listCandidateJobs, getJobSearchQuery(search));
  const [keyword, setKeyword] = useState(list.query.q);
  const [catalog, setCatalog] = useState({});
  const [catalogError, setCatalogError] = useState("");
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const setSearchRef = useRef(setSearch);
  setSearchRef.current = setSearch;
  const lastSearch = useRef(search.toString());
  const setQuery = list.setQuery;

  useEffect(() => { document.title = "Tìm việc | Smart Recruitment"; }, []);

  useEffect(() => {
    if (lastSearch.current === search.toString()) return;
    lastSearch.current = search.toString();
    const next = getJobSearchQuery(search);
    setKeyword(next.q);
    setQuery((current) => Object.keys(next).every((key) => current[key] === next[key]) ? current : next);
  }, [search, setQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(list.query)) {
      if (value !== "" && value != null) params.set(key, String(value));
    }
    lastSearch.current = params.toString();
    setSearchRef.current(params, { replace: true });
  }, [list.query]);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError("");
    const loadCatalog = publicView ? getPublicCatalog : getCandidateCatalog;
    loadCatalog(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setCatalog(result.data); })
      .catch((error) => { if (!controller.signal.aborted) setCatalogError(error.message); });
    return () => controller.abort();
  }, [catalogRefresh, publicView]);

  function changeFilter(name, value) {
    list.setQuery((current) => ({ ...current, [name]: value, page: 1 }));
  }

  function resetFilters() {
    list.setQuery((current) => ({ ...current, industryId: "", locationId: "", levelId: "", employmentTypeId: "", workMode: "", page: 1 }));
  }

  function handleSavedChange(jobId, saved) {
    list.setRows((rows) => rows.map((job) => String(job.id) === String(jobId) ? { ...job, is_saved: saved } : job));
    list.reload();
  }

  const filterProps = { catalog, query: list.query, onChange: changeFilter, onReset: resetFilters };
  const currentSearch = new URLSearchParams();
  for (const [key, value] of Object.entries(list.query)) {
    if (value !== "" && value != null) currentSearch.set(key, String(value));
  }
  const from = (publicView ? "/jobs?" : "/candidate/jobs?") + currentSearch.toString();

  return (
    <section>
      <div className="page-heading"><h1>Tìm việc phù hợp</h1></div>
      <Card className="job-search-card">
        <label className="search-label" htmlFor="job-keyword-search">Từ khóa tìm việc</label>
        <Input.Search id="job-keyword-search" value={keyword} maxLength={120} allowClear size="large" enterButton="Tìm kiếm"
          placeholder="Tên vị trí, mô tả hoặc yêu cầu công việc"
          onChange={(event) => { setKeyword(event.target.value); if (!event.target.value) changeFilter("q", ""); }}
          onSearch={(value) => changeFilter("q", value.trim())} />
      </Card>
      {catalogError && <Alert className="form-alert" type="warning" showIcon title="Chưa tải được danh mục bộ lọc" description={catalogError}
        action={<Button onClick={() => setCatalogRefresh((value) => value + 1)}>Thử lại</Button>} />}
      <div className="job-search-grid">
        <aside className="desktop-job-filters"><Card title="Bộ lọc"><JobFilters {...filterProps} prefix="desktop-" /></Card></aside>
        <div className="job-results">
          <div className="job-results-toolbar">
            <span>{list.loading ? "Đang tải việc làm…" : `${list.total} việc làm`}</span>
            <div className="job-results-actions">
              <Button className="mobile-filter-button" icon={<FilterOutlined />} onClick={() => setFiltersOpen(true)}>Bộ lọc</Button>
              <Button icon={<ReloadOutlined />} disabled={list.loading} onClick={list.reload} aria-label="Tải lại danh sách việc làm" />
            </div>
          </div>
          {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error} action={<Button onClick={list.reload}>Thử lại</Button>} />}
          <Spin spinning={list.loading}>
            <div className="job-cards">
              {list.rows.map((job) => <JobCard key={job.id} job={job} from={from} disabled={list.loading} publicView={publicView}
                onSavedChange={(saved) => handleSavedChange(job.id, saved)} />)}
              {!list.loading && !list.rows.length && !list.error && <Card><Empty description="Không có việc làm phù hợp. Bạn có thể thay đổi từ khóa hoặc bộ lọc." /></Card>}
            </div>
          </Spin>
          {list.total > 0 && <Pagination className="job-pagination" current={list.query.page} pageSize={list.query.limit} total={list.total}
            showSizeChanger pageSizeOptions={[10, 20, 50, 100]} disabled={list.loading}
            onChange={(page, limit) => list.setQuery((current) => ({ ...current, page, limit }))} />}
        </div>
      </div>
      <Drawer title="Bộ lọc việc làm" open={filtersOpen} onClose={() => setFiltersOpen(false)}
        footer={<Button type="primary" block onClick={() => setFiltersOpen(false)}>Xem kết quả</Button>}>
        <JobFilters {...filterProps} prefix="mobile-" />
      </Drawer>
    </section>
  );
}
