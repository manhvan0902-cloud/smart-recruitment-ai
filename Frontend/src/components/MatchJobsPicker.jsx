import { useState } from "react";
import { Alert, Button, Empty, Input, Table, Tag } from "antd";
import { Link } from "react-router-dom";
import usePaginatedList from "../hooks/usePaginatedList";
import { listCandidateJobs } from "../services/candidateService";

export default function MatchJobsPicker({ selectedJobs, onChange, disabled }) {
  const list = usePaginatedList(listCandidateJobs, { page: 1, limit: 10, q: "" });
  const [keyword, setKeyword] = useState("");
  const selectedIds = selectedJobs.map((job) => String(job.id));
  function select(job, checked) {
    if (disabled) return;
    if (checked && selectedJobs.length < 20 && !selectedIds.includes(String(job.id))) onChange([...selectedJobs, job]);
    else if (!checked) onChange(selectedJobs.filter((item) => String(item.id) !== String(job.id)));
  }
  return <div className="match-jobs-picker">
    <label className="field-label" htmlFor="match-job-search">Tìm tin để đối chiếu</label>
    <Input.Search id="match-job-search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Từ khóa vị trí, mô tả hoặc yêu cầu" maxLength={120}
      enterButton="Tìm kiếm" disabled={disabled} onSearch={() => list.setQuery((current) => ({ ...current, q: keyword.trim(), page: 1 }))} />
    <div className="selected-match-jobs"><p>Đã chọn {selectedJobs.length}/20 tin. Bạn có thể chọn qua nhiều trang.</p>
      {selectedJobs.map((job) => <Tag key={job.id} closable={!disabled} onClose={(event) => { event.preventDefault(); select(job, false); }}>{job.title}</Tag>)}</div>
    {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error} action={<Button disabled={disabled} onClick={list.reload}>Thử lại</Button>} />}
    <Table rowKey={(job) => String(job.id)} dataSource={list.rows} loading={list.loading} size="small" scroll={{ x: 560 }}
      columns={[
        { title: "Vị trí", dataIndex: "title", render: (title, job) => <Link to={"/candidate/jobs/" + job.id} target="_blank" rel="noopener noreferrer">{title}</Link> },
        { title: "Công ty", key: "company", render: (_, job) => job.company?.name || "—" },
      ]}
      rowSelection={{ selectedRowKeys: selectedIds, preserveSelectedRowKeys: true, hideSelectAll: true, onSelect: select,
        getCheckboxProps: (job) => ({ disabled: disabled || list.loading || (selectedJobs.length >= 20 && !selectedIds.includes(String(job.id))) }) }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={list.error ? "Chưa tải được tin tuyển dụng." : "Không có tin phù hợp với từ khóa."} /> }}
      pagination={{ current: list.query.page, pageSize: list.query.limit, total: list.total, showSizeChanger: false, disabled }}
      onChange={(pagination) => list.setQuery((current) => ({ ...current, page: pagination.current }))} />
  </div>;
}
