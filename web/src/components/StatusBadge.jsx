import { STATUS_LABEL } from '../utils.js';

export default function StatusBadge({ status }) {
  return <span className={`status status-${status?.toLowerCase()}`}>{STATUS_LABEL[status] || status}</span>;
}

