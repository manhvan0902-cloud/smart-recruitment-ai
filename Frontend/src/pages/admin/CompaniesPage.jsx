import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Select, Table } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import StatusTag from "../../components/StatusTag";
import usePaginatedList from "../../hooks/usePaginatedList";
import { listCompanies } from "../../services/adminService";
import { formatDateTime } from "../../utils/format";
import CompanyReviewDrawer from "./CompanyReviewDrawer";

export default function CompaniesPage() {
  const list = usePaginatedList(listCompanies, { page: 1, limit: 10, status: "PENDING" });
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    document.title = "Xác minh công ty | Smart Recruitment";
  }, []);

  function handleVerified(company) {
    setSelectedCompany((current) => {
      if (!current || String(current.id) !== String(company.id)) return current;
      return { ...current, ...company };
    });
    list.reload();
  }

  const columns = [
    {
      title: "Công ty",
      key: "company",
      width: 260,
      render: (_, company) => (
        <div className="table-identity">
          <Button type="link" className="table-title-button" onClick={() => setSelectedCompany(company)} disabled={list.loading}>{company.name}</Button>
          <span className="table-secondary">{company.industry?.name || "Chưa bổ sung ngành nghề"}</span>
        </div>
      ),
    },
    { title: "Email tài khoản", key: "email", width: 240, render: (_, company) => company.user?.email || "—" },
    { title: "Địa điểm", key: "location", width: 160, render: (_, company) => company.location?.name || "—" },
    { title: "Xác minh", dataIndex: "verification_status", width: 160, render: (status) => <StatusTag status={status} /> },
    { title: "Ngày tạo", dataIndex: "created_at", width: 190, render: formatDateTime },
    { title: "Thao tác", key: "actions", width: 140, render: (_, company) => <Button onClick={() => setSelectedCompany(company)} disabled={list.loading}>Xem hồ sơ</Button> },
  ];

  return (
    <section>
      <div className="page-heading page-heading-with-actions">
        <div><h1>Xác minh công ty</h1><p>Xem hồ sơ và cập nhật kết quả xác minh cho nhà tuyển dụng.</p></div>
        <Button icon={<ReloadOutlined />} onClick={list.reload} disabled={list.loading}>Tải lại</Button>
      </div>
      {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error}
        action={<Button onClick={list.reload}>Thử lại</Button>} />}
      <Card className="data-table-card">
        <div className="table-toolbar">
          <div className="filter-field">
            <label htmlFor="company-status-filter">Trạng thái xác minh</label>
            <Select id="company-status-filter" value={list.query.status}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                { value: "PENDING", label: "Chờ xác minh" },
                { value: "VERIFIED", label: "Đã xác minh" },
                { value: "REJECTED", label: "Bị từ chối" },
              ]}
              onChange={(status) => list.setQuery((current) => ({ ...current, status, page: 1 }))} />
          </div>
        </div>
        <Table
          rowKey={(company) => String(company.id)}
          columns={columns}
          dataSource={list.rows}
          loading={list.loading}
          scroll={{ x: 1150 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={list.error ? "Chưa tải được danh sách công ty." : "Chưa có công ty trong danh sách này."} /> }}
          pagination={{
            current: list.query.page,
            pageSize: list.query.limit,
            total: list.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} công ty`,
          }}
          onChange={(pagination) => list.setQuery((current) => ({ ...current, page: pagination.current, limit: pagination.pageSize }))}
        />
      </Card>
      <CompanyReviewDrawer company={selectedCompany} onClose={() => setSelectedCompany(null)} onVerified={handleVerified} />
    </section>
  );
}
